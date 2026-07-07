"use client";

// ============================================================
// Supabase同期ストア（現在は projects のみ移行済み）
//
// 方針: UIの応答性を保つため「ローカルキャッシュへ楽観反映 →
// バックグラウンドでSupabaseへ書き込み」のwrite-through方式。
// 失敗時はトーストで通知し、DBの実状態を再取得してUIを戻す。
//
// 取得(hydrateFromSupabase)は AppShell がアプリ入場時に呼ぶ。
// ============================================================

import { toast } from "@/components/shared/toast";
import { uid } from "../shared/format";
import * as local from "./store";
import type { ProjectInput } from "./store";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { Project, ProjectStatus } from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ------------------------------------------------------------
// エラー通知
// ------------------------------------------------------------

function errText(err: unknown): { message: string; code: string } {
  if (typeof err === "object" && err !== null) {
    const e = err as { message?: unknown; code?: unknown };
    return { message: String(e.message ?? err), code: String(e.code ?? "") };
  }
  return { message: String(err), code: "" };
}

function notifySyncError(action: string, err: unknown) {
  const { message, code } = errText(err);
  const schemaMissing =
    code === "PGRST205" || /schema cache|does not exist/i.test(message);
  toast({
    variant: "error",
    title: `${action}をSupabaseに保存できませんでした`,
    description: schemaMissing
      ? "データベース未初期化です。Supabaseダッシュボードで supabase/schema.sql を実行してください。"
      : message.slice(0, 120),
  });
  console.warn(`[supabase] ${action} failed:`, message);
}

// ------------------------------------------------------------
// 会社ID（RLSスコープ）。プロフィール未作成なら自己修復で作成する
// ------------------------------------------------------------

let companyId: string | null = null;
let provisioning: Promise<string | null> | null = null;

async function ensureCompanyId(): Promise<string | null> {
  if (companyId) return companyId;
  if (provisioning) return provisioning;

  provisioning = (async (): Promise<string | null> => {
    const sb = getSupabase();
    if (!sb) return null;
    const { data: userRes } = await sb.auth.getUser();
    const user = userRes.user;
    if (!user) return null;

    const { data: profile, error } = await sb
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (profile?.company_id) {
      companyId = profile.company_id as string;
      return companyId;
    }

    // プロフィール未作成なら会社+プロフィールをここで自動作成する（初回ログイン時）
    // 注意: RETURNING（.select()）は使わない。プロフィール作成前は
    // current_company_id() がnullでSELECTポリシーに弾かれるため、
    // IDをクライアント側で生成し、返却なしのINSERTで登録する。
    const companyName = (user.user_metadata?.company_name as string) || "マイ会社";
    const newCompanyId = uid();
    const { error: companyError } = await sb
      .from("companies")
      .insert({ id: newCompanyId, name: companyName });
    if (companyError) throw companyError;

    const { error: profileError } = await sb.from("profiles").insert({
      id: user.id,
      company_id: newCompanyId,
      name: (user.user_metadata?.name as string) || user.email || "ユーザー",
      email: user.email ?? "",
      role: "owner",
    });
    if (profileError) throw profileError;

    companyId = newCompanyId;
    return companyId;
  })().finally(() => {
    provisioning = null;
  });

  return provisioning;
}

// ------------------------------------------------------------
// 行 ⇔ ドメイン型のマッピング（snake_case ⇔ camelCase）
// ------------------------------------------------------------

interface ProjectRow {
  id: string;
  name: string;
  customer_name: string | null;
  site_address: string | null;
  manager_id: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  memo: string | null;
  tags: string[] | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    customerName: row.customer_name ?? "",
    siteAddress: row.site_address ?? "",
    managerId: row.manager_id,
    status: row.status,
    startDate: row.start_date,
    dueDate: row.due_date,
    completedDate: row.completed_date,
    memo: row.memo ?? "",
    tags: row.tags ?? [],
    color: row.color ?? "#F97316",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function projectToRow(project: Project, company: string): Record<string, unknown> {
  return {
    id: project.id,
    company_id: company,
    name: project.name,
    customer_name: project.customerName,
    site_address: project.siteAddress,
    // デモ由来の担当者ID（UUIDでない）はDBへ送らない（profiles外部キーのため）
    manager_id: project.managerId && UUID_RE.test(project.managerId) ? project.managerId : null,
    status: project.status,
    start_date: project.startDate,
    due_date: project.dueDate,
    completed_date: project.completedDate,
    memo: project.memo,
    tags: project.tags,
    color: project.color,
  };
}

function patchToRow(patch: Partial<ProjectInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.customerName !== undefined) row.customer_name = patch.customerName;
  if (patch.siteAddress !== undefined) row.site_address = patch.siteAddress;
  if (patch.managerId !== undefined) {
    row.manager_id = patch.managerId && UUID_RE.test(patch.managerId) ? patch.managerId : null;
  }
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.startDate !== undefined) row.start_date = patch.startDate;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  if (patch.completedDate !== undefined) row.completed_date = patch.completedDate;
  if (patch.memo !== undefined) row.memo = patch.memo;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.color !== undefined) row.color = patch.color;
  return row;
}

// ------------------------------------------------------------
// 取得（案件一覧・詳細はローカルキャッシュ経由で参照される）
// ------------------------------------------------------------

async function refetchProjects(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb
    .from("projects")
    .select(
      "id,name,customer_name,site_address,manager_id,status,start_date,due_date,completed_date,memo,tags,color,created_at,updated_at"
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;
  local.replaceProjects((data as ProjectRow[]).map(rowToProject));
}

let hydrating = false;

/**
 * Supabaseからデータを取得してローカルキャッシュへ反映する。
 * アプリ入場時（AppShell）に呼ばれる。デモモード・未設定時は何もしない。
 */
export async function hydrateFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (local.getSession()?.mode !== "supabase") return;
  if (hydrating) return;
  hydrating = true;
  try {
    await ensureCompanyId();
    await refetchProjects();
  } catch (err) {
    notifySyncError("データの取得", err);
  } finally {
    hydrating = false;
  }
}

// ------------------------------------------------------------
// 書き込み（楽観反映 → バックグラウンド同期）
// ------------------------------------------------------------

function syncInBackground(action: string, fn: () => Promise<void>) {
  void fn().catch((err) => {
    notifySyncError(action, err);
    // DBの実状態に合わせてUIを戻す
    void refetchProjects().catch(() => {});
  });
}

export function spAddProject(input: ProjectInput): Project {
  const project = local.addProject(input);
  syncInBackground("案件の作成", async () => {
    const sb = getSupabase();
    if (!sb) return;
    const company = await ensureCompanyId();
    if (!company) throw new Error("会社情報を取得できませんでした（再ログインをお試しください）");
    const { error } = await sb.from("projects").insert(projectToRow(project, company));
    if (error) throw error;
  });
  return project;
}

export function spUpdateProject(id: string, patch: Partial<ProjectInput>): void {
  local.updateProject(id, patch);
  syncInBackground("案件の更新", async () => {
    const sb = getSupabase();
    if (!sb) return;
    await ensureCompanyId();
    const { error } = await sb.from("projects").update(patchToRow(patch)).eq("id", id);
    if (error) throw error;
  });
}

export function spRemoveProject(id: string): void {
  local.removeProject(id);
  syncInBackground("案件の削除", async () => {
    const sb = getSupabase();
    if (!sb) return;
    await ensureCompanyId();
    const { error } = await sb.from("projects").delete().eq("id", id);
    if (error) throw error;
  });
}
