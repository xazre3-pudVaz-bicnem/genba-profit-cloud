"use client";

// ============================================================
// Supabase同期ストア（projects / revenues / costs 移行済み）
//
// 方針: UIの応答性を保つため「ローカルキャッシュへ楽観反映 →
// バックグラウンドでSupabaseへ書き込み」のwrite-through方式。
// 書き込みは直列キューで実行し、案件作成→売上追加のような
// 連続操作でも外部キー順序が崩れないようにする。
// 失敗時はトーストで通知し、DBの実状態を再取得してUIを戻す。
//
// 取得(hydrateFromSupabase)は AppShell がアプリ入場時に呼ぶ。
// ============================================================

import { toast } from "@/components/shared/toast";
import { uid } from "../shared/format";
import * as local from "./store";
import type { CostInput, ProjectInput, RevenueInput } from "./store";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type {
  Cost,
  CostStatus,
  CostType,
  ExpenseCategory,
  PaymentMethod,
  Project,
  ProjectStatus,
  Revenue,
  RevenueStatus,
  TaxType,
} from "./types";

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

// 書類は未移行（ローカル管理）のため、document_id はUUIDのときだけDBへ送る
function docIdOrNull(documentId: string | null | undefined): string | null {
  return documentId && UUID_RE.test(documentId) ? documentId : null;
}

interface RevenueRow {
  id: string;
  project_id: string;
  title: string;
  amount: number;
  tax_type: TaxType;
  tax_amount: number;
  billing_due_date: string | null;
  billed_date: string | null;
  payment_due_date: string | null;
  paid_date: string | null;
  status: RevenueStatus;
  memo: string | null;
  document_id: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRevenue(row: RevenueRow): Revenue {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    amount: row.amount,
    taxType: row.tax_type,
    taxAmount: row.tax_amount,
    billingDueDate: row.billing_due_date,
    billedDate: row.billed_date,
    paymentDueDate: row.payment_due_date,
    paidDate: row.paid_date,
    status: row.status,
    memo: row.memo ?? "",
    documentId: row.document_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function revenueToRow(revenue: Revenue, company: string): Record<string, unknown> {
  return {
    id: revenue.id,
    company_id: company,
    project_id: revenue.projectId,
    title: revenue.title,
    amount: revenue.amount,
    tax_type: revenue.taxType,
    tax_amount: revenue.taxAmount,
    billing_due_date: revenue.billingDueDate,
    billed_date: revenue.billedDate,
    payment_due_date: revenue.paymentDueDate,
    paid_date: revenue.paidDate,
    status: revenue.status,
    memo: revenue.memo,
    document_id: docIdOrNull(revenue.documentId),
  };
}

function revenuePatchToRow(patch: Partial<RevenueInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.projectId !== undefined) row.project_id = patch.projectId;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.taxType !== undefined) row.tax_type = patch.taxType;
  if (patch.taxAmount !== undefined) row.tax_amount = patch.taxAmount;
  if (patch.billingDueDate !== undefined) row.billing_due_date = patch.billingDueDate;
  if (patch.billedDate !== undefined) row.billed_date = patch.billedDate;
  if (patch.paymentDueDate !== undefined) row.payment_due_date = patch.paymentDueDate;
  if (patch.paidDate !== undefined) row.paid_date = patch.paidDate;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.memo !== undefined) row.memo = patch.memo;
  if (patch.documentId !== undefined) row.document_id = docIdOrNull(patch.documentId);
  return row;
}

interface CostRow {
  id: string;
  project_id: string;
  type: CostType;
  vendor_name: string | null;
  title: string | null;
  category: ExpenseCategory | null;
  amount: number;
  tax_type: TaxType;
  tax_amount: number;
  payment_method: PaymentMethod | null;
  purchase_date: string | null;
  payment_due_date: string | null;
  paid_date: string | null;
  status: CostStatus;
  memo: string | null;
  document_id: string | null;
  created_at: string;
  updated_at: string;
}

function rowToCost(row: CostRow): Cost {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type,
    vendorName: row.vendor_name ?? "",
    title: row.title ?? "",
    category: row.category,
    amount: row.amount,
    taxType: row.tax_type,
    taxAmount: row.tax_amount,
    paymentMethod: row.payment_method,
    purchaseDate: row.purchase_date,
    paymentDueDate: row.payment_due_date,
    paidDate: row.paid_date,
    status: row.status,
    memo: row.memo ?? "",
    documentId: row.document_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function costToRow(cost: Cost, company: string): Record<string, unknown> {
  return {
    id: cost.id,
    company_id: company,
    project_id: cost.projectId,
    type: cost.type,
    vendor_name: cost.vendorName,
    title: cost.title,
    category: cost.category,
    amount: cost.amount,
    tax_type: cost.taxType,
    tax_amount: cost.taxAmount,
    payment_method: cost.paymentMethod,
    purchase_date: cost.purchaseDate,
    payment_due_date: cost.paymentDueDate,
    paid_date: cost.paidDate,
    status: cost.status,
    memo: cost.memo,
    document_id: docIdOrNull(cost.documentId),
  };
}

function costPatchToRow(patch: Partial<CostInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.projectId !== undefined) row.project_id = patch.projectId;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.vendorName !== undefined) row.vendor_name = patch.vendorName;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.taxType !== undefined) row.tax_type = patch.taxType;
  if (patch.taxAmount !== undefined) row.tax_amount = patch.taxAmount;
  if (patch.paymentMethod !== undefined) row.payment_method = patch.paymentMethod;
  if (patch.purchaseDate !== undefined) row.purchase_date = patch.purchaseDate;
  if (patch.paymentDueDate !== undefined) row.payment_due_date = patch.paymentDueDate;
  if (patch.paidDate !== undefined) row.paid_date = patch.paidDate;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.memo !== undefined) row.memo = patch.memo;
  if (patch.documentId !== undefined) row.document_id = docIdOrNull(patch.documentId);
  return row;
}

// ------------------------------------------------------------
// 取得（一覧・詳細・ダッシュボードはローカルキャッシュ経由で参照される）
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

async function refetchRevenues(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb
    .from("revenues")
    .select(
      "id,project_id,title,amount,tax_type,tax_amount,billing_due_date,billed_date,payment_due_date,paid_date,status,memo,document_id,created_at,updated_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  local.replaceRevenues((data as RevenueRow[]).map(rowToRevenue));
}

async function refetchCosts(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb
    .from("costs")
    .select(
      "id,project_id,type,vendor_name,title,category,amount,tax_type,tax_amount,payment_method,purchase_date,payment_due_date,paid_date,status,memo,document_id,created_at,updated_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  local.replaceCosts((data as CostRow[]).map(rowToCost));
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
    await Promise.all([refetchProjects(), refetchRevenues(), refetchCosts()]);
  } catch (err) {
    notifySyncError("データの取得", err);
  } finally {
    hydrating = false;
  }
}

// ------------------------------------------------------------
// 書き込み（楽観反映 → バックグラウンド同期）
// 直列キューで実行順を保証する（例: 案件作成→直後の売上追加で
// project_id 外部キーが先に存在している必要がある）
// ------------------------------------------------------------

let syncQueue: Promise<void> = Promise.resolve();

function syncInBackground(action: string, fn: () => Promise<void>, rollback: () => Promise<void>) {
  syncQueue = syncQueue.then(async () => {
    try {
      await fn();
    } catch (err) {
      notifySyncError(action, err);
      // DBの実状態に合わせてUIを戻す
      await rollback().catch(() => {});
    }
  });
}

async function requireCompanyId(): Promise<string> {
  const company = await ensureCompanyId();
  if (!company) throw new Error("会社情報を取得できませんでした（再ログインをお試しください）");
  return company;
}

// ---------- 案件 ----------

export function spAddProject(input: ProjectInput): Project {
  const project = local.addProject(input);
  syncInBackground(
    "案件の作成",
    async () => {
      const sb = getSupabase();
      if (!sb) return;
      const company = await requireCompanyId();
      const { error } = await sb.from("projects").insert(projectToRow(project, company));
      if (error) throw error;
    },
    refetchProjects
  );
  return project;
}

export function spUpdateProject(id: string, patch: Partial<ProjectInput>): void {
  local.updateProject(id, patch);
  syncInBackground(
    "案件の更新",
    async () => {
      const sb = getSupabase();
      if (!sb) return;
      await ensureCompanyId();
      const { error } = await sb.from("projects").update(patchToRow(patch)).eq("id", id);
      if (error) throw error;
    },
    refetchProjects
  );
}

export function spRemoveProject(id: string): void {
  // ローカル同様、DB側も外部キーのcascadeで売上・原価が削除される
  local.removeProject(id);
  syncInBackground(
    "案件の削除",
    async () => {
      const sb = getSupabase();
      if (!sb) return;
      await ensureCompanyId();
      const { error } = await sb.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    refetchProjects
  );
}

// ---------- 売上 ----------

export function spAddRevenue(input: RevenueInput): Revenue {
  const revenue = local.addRevenue(input);
  syncInBackground(
    "売上の作成",
    async () => {
      const sb = getSupabase();
      if (!sb) return;
      const company = await requireCompanyId();
      const { error } = await sb.from("revenues").insert(revenueToRow(revenue, company));
      if (error) throw error;
    },
    refetchRevenues
  );
  return revenue;
}

export function spUpdateRevenue(id: string, patch: Partial<RevenueInput>): void {
  local.updateRevenue(id, patch);
  syncInBackground(
    "売上の更新",
    async () => {
      const sb = getSupabase();
      if (!sb) return;
      await ensureCompanyId();
      const { error } = await sb.from("revenues").update(revenuePatchToRow(patch)).eq("id", id);
      if (error) throw error;
    },
    refetchRevenues
  );
}

export function spRemoveRevenue(id: string): void {
  local.removeRevenue(id);
  syncInBackground(
    "売上の削除",
    async () => {
      const sb = getSupabase();
      if (!sb) return;
      await ensureCompanyId();
      const { error } = await sb.from("revenues").delete().eq("id", id);
      if (error) throw error;
    },
    refetchRevenues
  );
}

// ---------- 原価（発注費・材料費・経費） ----------

export function spAddCost(input: CostInput): Cost {
  const cost = local.addCost(input);
  syncInBackground(
    "原価の登録",
    async () => {
      const sb = getSupabase();
      if (!sb) return;
      const company = await requireCompanyId();
      const { error } = await sb.from("costs").insert(costToRow(cost, company));
      if (error) throw error;
    },
    refetchCosts
  );
  return cost;
}

export function spUpdateCost(id: string, patch: Partial<CostInput>): void {
  local.updateCost(id, patch);
  syncInBackground(
    "原価の更新",
    async () => {
      const sb = getSupabase();
      if (!sb) return;
      await ensureCompanyId();
      const { error } = await sb.from("costs").update(costPatchToRow(patch)).eq("id", id);
      if (error) throw error;
    },
    refetchCosts
  );
}

export function spRemoveCost(id: string): void {
  local.removeCost(id);
  syncInBackground(
    "原価の削除",
    async () => {
      const sb = getSupabase();
      if (!sb) return;
      await ensureCompanyId();
      const { error } = await sb.from("costs").delete().eq("id", id);
      if (error) throw error;
    },
    refetchCosts
  );
}
