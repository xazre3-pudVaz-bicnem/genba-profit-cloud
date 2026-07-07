"use client";

// ============================================================
// Supabase同期ストア（projects / revenues / costs / documents 移行済み）
//
// 方針: UIの応答性を保つため「ローカルキャッシュへ楽観反映 →
// バックグラウンドでSupabaseへ書き込み」のwrite-through方式。
// 書き込みは直列キューで実行し、案件作成→売上追加のような
// 連続操作でも外部キー順序が崩れないようにする。
// 失敗時はトーストで通知し、DBの実状態を再取得してUIを戻す。
//
// 書類ファイルは Storage の documents バケットへ保存する。
// パスは {company_id}/projects/{project_id}/documents/{ts}-{name}
// （案件未定は {company_id}/unassigned/documents/...）。
// 適用済みのStorageポリシーが「第1フォルダ = 会社ID」を要求する
// ため、パスは必ず会社IDから始める。バケットは非公開なので、
// プレビューは getDocumentSignedUrl の署名URL経由で行う。
//
// 取得(hydrateFromSupabase)は AppShell がアプリ入場時に呼ぶ。
// ============================================================

import { toast } from "@/components/shared/toast";
import { uid } from "../shared/format";
import * as local from "./store";
import type { CostInput, DocumentInput, ProjectInput, RevenueInput } from "./store";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { safeStorageFileName, validateDocumentFile } from "./upload";
import type {
  Confidence,
  Cost,
  CostStatus,
  CostType,
  DocumentRec,
  DocumentStatus,
  DocumentType,
  ExpenseCategory,
  OcrResult,
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
let userId: string | null = null;
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
    userId = user.id;

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

interface DocumentRow {
  id: string;
  project_id: string | null;
  uploaded_by: string | null;
  document_type: DocumentType;
  file_url: string | null;
  thumbnail_url: string | null;
  vendor_name: string | null;
  document_date: string | null;
  total_amount: number | null;
  tax_amount: number | null;
  ocr_text: string | null;
  ai_json: unknown;
  assignment_confidence: Confidence | null;
  status: DocumentStatus;
  registered_kind: "cost" | "revenue" | null;
  registered_id: string | null;
  created_at: string;
  updated_at: string;
  /** profiles埋め込み（アップロード者の表示名） */
  uploader: { name: string } | { name: string }[] | null;
}

function rowToDocument(row: DocumentRow): DocumentRec {
  const uploader = Array.isArray(row.uploader) ? row.uploader[0] : row.uploader;
  return {
    id: row.id,
    projectId: row.project_id,
    uploadedBy: uploader?.name ?? "",
    documentType: row.document_type,
    fileUrl: row.file_url,
    thumbnailUrl: row.thumbnail_url,
    vendorName: row.vendor_name ?? "",
    documentDate: row.document_date,
    totalAmount: row.total_amount,
    taxAmount: row.tax_amount,
    ocrText: row.ocr_text ?? "",
    ai: (row.ai_json as OcrResult | null) ?? null,
    assignmentConfidence: row.assignment_confidence,
    status: row.status,
    registeredTo:
      row.registered_kind && row.registered_id
        ? { kind: row.registered_kind, id: row.registered_id }
        : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// dataURLサムネイルはサイズが大きいためDBへは保存しない（http URLのみ保存）
function thumbOrNull(thumbnailUrl: string | null | undefined): string | null {
  return thumbnailUrl && /^https?:/.test(thumbnailUrl) ? thumbnailUrl : null;
}

function documentToRow(doc: DocumentRec, company: string, uploader: string | null): Record<string, unknown> {
  return {
    id: doc.id,
    company_id: company,
    project_id: doc.projectId && UUID_RE.test(doc.projectId) ? doc.projectId : null,
    uploaded_by: uploader,
    document_type: doc.documentType,
    file_url: doc.fileUrl,
    thumbnail_url: thumbOrNull(doc.thumbnailUrl),
    vendor_name: doc.vendorName,
    document_date: doc.documentDate,
    total_amount: doc.totalAmount,
    tax_amount: doc.taxAmount,
    ocr_text: doc.ocrText,
    ai_json: doc.ai,
    assignment_confidence: doc.assignmentConfidence,
    status: doc.status,
    registered_kind: doc.registeredTo?.kind ?? null,
    registered_id: doc.registeredTo?.id ?? null,
  };
}

function documentPatchToRow(patch: Partial<DocumentInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.projectId !== undefined) {
    row.project_id = patch.projectId && UUID_RE.test(patch.projectId) ? patch.projectId : null;
  }
  if (patch.documentType !== undefined) row.document_type = patch.documentType;
  if (patch.fileUrl !== undefined) row.file_url = patch.fileUrl;
  if (patch.thumbnailUrl !== undefined) row.thumbnail_url = thumbOrNull(patch.thumbnailUrl);
  if (patch.vendorName !== undefined) row.vendor_name = patch.vendorName;
  if (patch.documentDate !== undefined) row.document_date = patch.documentDate;
  if (patch.totalAmount !== undefined) row.total_amount = patch.totalAmount;
  if (patch.taxAmount !== undefined) row.tax_amount = patch.taxAmount;
  if (patch.ocrText !== undefined) row.ocr_text = patch.ocrText;
  if (patch.ai !== undefined) row.ai_json = patch.ai;
  if (patch.assignmentConfidence !== undefined) row.assignment_confidence = patch.assignmentConfidence;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.registeredTo !== undefined) {
    row.registered_kind = patch.registeredTo?.kind ?? null;
    row.registered_id = patch.registeredTo?.id ?? null;
  }
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

async function refetchDocuments(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb
    .from("documents")
    .select(
      "id,project_id,uploaded_by,document_type,file_url,thumbnail_url,vendor_name,document_date,total_amount,tax_amount,ocr_text,ai_json,assignment_confidence,status,registered_kind,registered_id,created_at,updated_at,uploader:profiles!uploaded_by(name)"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  local.replaceDocuments((data as unknown as DocumentRow[]).map(rowToDocument));
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
    await Promise.all([refetchProjects(), refetchRevenues(), refetchCosts(), refetchDocuments()]);
  } catch (err) {
    notifySyncError("データの取得", err);
  } finally {
    hydrating = false;
  }
}

// ------------------------------------------------------------
// Storage（書類ファイル）
// ------------------------------------------------------------

const DOCUMENTS_BUCKET = "documents";

/**
 * 書類ファイルをStorageへアップロードし、保存パスを返す。
 * パスは会社IDから始まる（StorageのRLSポリシー要件）。
 * 失敗時は日本語メッセージのErrorを投げる。
 */
export async function spUploadDocumentFile(file: File, projectId: string | null): Promise<string> {
  const invalid = validateDocumentFile(file);
  if (invalid) throw new Error(invalid);
  const sb = getSupabase();
  if (!sb) throw new Error("Supabaseが未設定です");
  const company = await ensureCompanyId();
  if (!company) throw new Error("会社情報を取得できませんでした（再ログインをお試しください）");

  const folder = projectId && UUID_RE.test(projectId) ? `projects/${projectId}` : "unassigned";
  const path = `${company}/${folder}/documents/${Date.now()}-${safeStorageFileName(file.name, file.type)}`;
  const { error } = await sb.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

// 署名URLキャッシュ（発行は60分・キャッシュは50分で更新）
const signedUrlCache = new Map<string, { url: string; expires: number }>();

/**
 * 書類の表示用URLを返す。
 * http / data / blob URLはそのまま、Storageパスは署名URLへ変換する。
 */
export async function getDocumentSignedUrl(fileUrl: string | null): Promise<string | null> {
  if (!fileUrl) return null;
  if (/^(https?:|data:|blob:)/.test(fileUrl)) return fileUrl;
  const cached = signedUrlCache.get(fileUrl);
  if (cached && cached.expires > Date.now()) return cached.url;
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.storage.from(DOCUMENTS_BUCKET).createSignedUrl(fileUrl, 3600);
  if (error || !data?.signedUrl) return null;
  signedUrlCache.set(fileUrl, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
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
      // 紐づく書類を「確認待ち」へ戻す（ローカル処理と同じ）
      await sb
        .from("documents")
        .update({ registered_kind: null, registered_id: null, status: "needs_review" })
        .eq("registered_id", id);
    },
    async () => {
      await refetchRevenues();
      await refetchDocuments();
    }
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
      // 紐づく書類を「確認待ち」へ戻す（ローカル処理と同じ）
      await sb
        .from("documents")
        .update({ registered_kind: null, registered_id: null, status: "needs_review" })
        .eq("registered_id", id);
    },
    async () => {
      await refetchCosts();
      await refetchDocuments();
    }
  );
}

// ---------- 書類 ----------

export function spAddDocument(input: DocumentInput): DocumentRec {
  const doc = local.addDocument(input);
  syncInBackground(
    "書類の保存",
    async () => {
      const sb = getSupabase();
      if (!sb) return;
      const company = await requireCompanyId();
      const { error } = await sb.from("documents").insert(documentToRow(doc, company, userId));
      if (error) throw error;
    },
    refetchDocuments
  );
  return doc;
}

export function spUpdateDocument(id: string, patch: Partial<DocumentInput>): void {
  local.updateDocument(id, patch);
  syncInBackground(
    "書類の更新",
    async () => {
      const sb = getSupabase();
      if (!sb) return;
      await ensureCompanyId();
      const { error } = await sb.from("documents").update(documentPatchToRow(patch)).eq("id", id);
      if (error) throw error;
    },
    refetchDocuments
  );
}

export function spRemoveDocument(id: string): void {
  const target = local.getDB().documents.find((d) => d.id === id);
  local.removeDocument(id);
  syncInBackground(
    "書類の削除",
    async () => {
      const sb = getSupabase();
      if (!sb) return;
      await ensureCompanyId();
      // 収支側の紐づけを解除（ローカル処理と同じ。失敗しても削除は続行）
      await sb.from("revenues").update({ document_id: null }).eq("document_id", id);
      await sb.from("costs").update({ document_id: null }).eq("document_id", id);
      const { error } = await sb.from("documents").delete().eq("id", id);
      if (error) throw error;
      // Storage上のファイルも削除（ベストエフォート）
      if (target?.fileUrl && !/^(https?:|data:|blob:)/.test(target.fileUrl)) {
        await sb.storage
          .from(DOCUMENTS_BUCKET)
          .remove([target.fileUrl])
          .catch(() => {});
      }
    },
    async () => {
      await refetchDocuments();
      await refetchRevenues();
      await refetchCosts();
    }
  );
}
