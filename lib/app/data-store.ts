"use client";

// ============================================================
// データ操作の抽象化レイヤ
//
// UI（ページ・コンポーネント）は必ずこのモジュールを経由して
// データを操作する。実装は DataStore インターフェースで統一し、
//   - demoStore     : localStorage実装（デモモード / Supabase未設定時）
//   - supabaseStore : Supabase実装（★projects/revenues/costs移行済み）
// を getDataStore() が毎回の呼び出し時に選択する。
//
// 切替ルール:
//   Supabase設定済み かつ セッションが supabaseモード → supabaseStore
//   それ以外（デモセッション・未設定・未ログイン）      → demoStore
//   ※ /app?demo=true はデモセッションになるため常に demoStore
//
// 移行状況:
//   [済] projects / revenues / costs / documents（一覧取得・作成・編集・削除）
//        書類ファイルは Storage documents バケット + 署名URLプレビュー
//   [未] estimates / invoices / members / company
//        → lib/app/supabase-store.ts に sp〇〇 を追加し、下の supabaseStore に
//          割り当てるだけで順次移行できる
// ============================================================

import * as demo from "./store";
import {
  spAddCost,
  spAddDocument,
  spAddProject,
  spAddRevenue,
  spRemoveCost,
  spRemoveDocument,
  spRemoveProject,
  spRemoveRevenue,
  spUpdateCost,
  spUpdateDocument,
  spUpdateProject,
  spUpdateRevenue,
  spUploadDocumentFile,
} from "./supabase-store";
import { isSupabaseConfigured } from "./supabase";
import type {
  Company,
  Cost,
  DocumentRec,
  Estimate,
  Invoice,
  Member,
  Project,
  Revenue,
} from "./types";
import type {
  CostInput,
  DocumentInput,
  EstimateInput,
  InvoiceInput,
  ProjectInput,
  RevenueInput,
} from "./store";

export interface DataStore {
  // 案件
  addProject(input: ProjectInput): Project;
  updateProject(id: string, patch: Partial<ProjectInput>): void;
  removeProject(id: string): void;
  // 売上
  addRevenue(input: RevenueInput): Revenue;
  updateRevenue(id: string, patch: Partial<RevenueInput>): void;
  removeRevenue(id: string): void;
  // 原価（発注費・材料費・経費）
  addCost(input: CostInput): Cost;
  updateCost(id: string, patch: Partial<CostInput>): void;
  removeCost(id: string): void;
  // 書類
  addDocument(input: DocumentInput): DocumentRec;
  updateDocument(id: string, patch: Partial<DocumentInput>): void;
  removeDocument(id: string): void;
  // 見積・請求
  addEstimate(input: EstimateInput): Estimate;
  updateEstimate(id: string, patch: Partial<EstimateInput>): void;
  removeEstimate(id: string): void;
  addInvoice(input: InvoiceInput): Invoice;
  updateInvoice(id: string, patch: Partial<InvoiceInput>): void;
  removeInvoice(id: string): void;
  // 会社・メンバー
  updateCompany(patch: Partial<Company>): void;
  addMember(input: Omit<Member, "id" | "createdAt">): Member;
  updateMember(id: string, patch: Partial<Omit<Member, "id" | "createdAt">>): void;
  removeMember(id: string): void;
}

/** デモ実装（localStorage永続化・リアクティブ） */
export const demoStore: DataStore = {
  addProject: demo.addProject,
  updateProject: demo.updateProject,
  removeProject: demo.removeProject,
  addRevenue: demo.addRevenue,
  updateRevenue: demo.updateRevenue,
  removeRevenue: demo.removeRevenue,
  addCost: demo.addCost,
  updateCost: demo.updateCost,
  removeCost: demo.removeCost,
  addDocument: demo.addDocument,
  updateDocument: demo.updateDocument,
  removeDocument: demo.removeDocument,
  addEstimate: demo.addEstimate,
  updateEstimate: demo.updateEstimate,
  removeEstimate: demo.removeEstimate,
  addInvoice: demo.addInvoice,
  updateInvoice: demo.updateInvoice,
  removeInvoice: demo.removeInvoice,
  updateCompany: demo.updateCompany,
  addMember: demo.addMember,
  updateMember: demo.updateMember,
  removeMember: demo.removeMember,
};

/**
 * Supabase実装。
 * projects / revenues / costs / documents はDBへwrite-through同期、
 * 未移行のエンティティはローカルキャッシュ（live名前空間）で動作する。
 */
export const supabaseStore: DataStore = {
  ...demoStore,
  addProject: spAddProject,
  updateProject: spUpdateProject,
  removeProject: spRemoveProject,
  addRevenue: spAddRevenue,
  updateRevenue: spUpdateRevenue,
  removeRevenue: spRemoveRevenue,
  addCost: spAddCost,
  updateCost: spUpdateCost,
  removeCost: spRemoveCost,
  addDocument: spAddDocument,
  updateDocument: spUpdateDocument,
  removeDocument: spRemoveDocument,
};

/**
 * 現在有効なDataStoreを返す。
 * デモセッション（/app?demo=true 含む）は常に demoStore。
 */
export function getDataStore(): DataStore {
  if (isSupabaseConfigured() && demo.getSession()?.mode === "supabase") {
    return supabaseStore;
  }
  return demoStore;
}

function isSupabaseMode(): boolean {
  return isSupabaseConfigured() && demo.getSession()?.mode === "supabase";
}

/**
 * 書類ファイルの保存。
 * 本番モード: Storageへアップロードして保存パスを返す（失敗時はthrow）。
 * デモモード: アップロードせずnull（サムネイルのローカル保存のみ）。
 */
export async function uploadDocumentFile(
  file: File,
  projectId: string | null
): Promise<string | null> {
  if (isSupabaseMode()) {
    return spUploadDocumentFile(file, projectId);
  }
  return null;
}

// ------------------------------------------------------------
// UI向けエクスポート（呼び出しのたびに現在のストアへディスパッチ）
// ------------------------------------------------------------

export function addProject(input: ProjectInput): Project {
  return getDataStore().addProject(input);
}
export function updateProject(id: string, patch: Partial<ProjectInput>): void {
  getDataStore().updateProject(id, patch);
}
export function removeProject(id: string): void {
  getDataStore().removeProject(id);
}
export function addRevenue(input: RevenueInput): Revenue {
  return getDataStore().addRevenue(input);
}
export function updateRevenue(id: string, patch: Partial<RevenueInput>): void {
  getDataStore().updateRevenue(id, patch);
}
export function removeRevenue(id: string): void {
  getDataStore().removeRevenue(id);
}
export function addCost(input: CostInput): Cost {
  return getDataStore().addCost(input);
}
export function updateCost(id: string, patch: Partial<CostInput>): void {
  getDataStore().updateCost(id, patch);
}
export function removeCost(id: string): void {
  getDataStore().removeCost(id);
}
export function addDocument(input: DocumentInput): DocumentRec {
  return getDataStore().addDocument(input);
}
export function updateDocument(id: string, patch: Partial<DocumentInput>): void {
  getDataStore().updateDocument(id, patch);
}
export function removeDocument(id: string): void {
  getDataStore().removeDocument(id);
}
export function addEstimate(input: EstimateInput): Estimate {
  return getDataStore().addEstimate(input);
}
export function updateEstimate(id: string, patch: Partial<EstimateInput>): void {
  getDataStore().updateEstimate(id, patch);
}
export function removeEstimate(id: string): void {
  getDataStore().removeEstimate(id);
}
export function addInvoice(input: InvoiceInput): Invoice {
  return getDataStore().addInvoice(input);
}
export function updateInvoice(id: string, patch: Partial<InvoiceInput>): void {
  getDataStore().updateInvoice(id, patch);
}
export function removeInvoice(id: string): void {
  getDataStore().removeInvoice(id);
}
export function updateCompany(patch: Partial<Company>): void {
  getDataStore().updateCompany(patch);
}
export function addMember(input: Omit<Member, "id" | "createdAt">): Member {
  return getDataStore().addMember(input);
}
export function updateMember(
  id: string,
  patch: Partial<Omit<Member, "id" | "createdAt">>
): void {
  getDataStore().updateMember(id, patch);
}
export function removeMember(id: string): void {
  getDataStore().removeMember(id);
}

// 購読フック・セッション・ユーティリティ（実装はストア共通）
export {
  useDB,
  useSession,
  getDB,
  getSession,
  setSession,
  startDemoSession,
  resetDemoData,
  exportDataJSON,
  type ProjectInput,
  type RevenueInput,
  type CostInput,
  type DocumentInput,
  type EstimateInput,
  type InvoiceInput,
} from "./store";
export { hydrateFromSupabase, getDocumentSignedUrl } from "./supabase-store";
