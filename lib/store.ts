"use client";

import { useSyncExternalStore } from "react";
import { emptyDB, seedDemoData } from "./demo-data";
import { nowISO, uid } from "./format";
import type {
  Company,
  Cost,
  DB,
  DocumentRec,
  Estimate,
  Invoice,
  Member,
  Project,
  Revenue,
  Session,
} from "./types";

// ============================================================
// クライアントストア（デモモード: localStorage永続化）
//
// 将来的にSupabaseへ差し替える場合は、この層のCRUD関数を
// Supabaseクエリに置き換える（lib/supabase/ 参照）。
// UI側はすべてこの層の関数のみを呼ぶため、差し替え影響は最小。
// ============================================================

const DB_KEY = "genba-cloud-db-v1";
const SESSION_KEY = "genba-cloud-session-v1";

let db: DB | null = null;
const listeners = new Set<() => void>();

const SERVER_DB: DB = emptyDB();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit() {
  listeners.forEach((l) => l());
}

function load(): DB {
  if (typeof window === "undefined") return SERVER_DB;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Omit<DB, "hydrated">;
      return { ...emptyDB(), ...parsed, hydrated: true };
    }
  } catch {
    // 壊れたデータは破棄して再シード
  }
  const seeded = seedDemoData();
  persist(seeded);
  return seeded;
}

function persist(next: DB) {
  if (typeof window === "undefined") return;
  try {
    const { hydrated: _hydrated, ...rest } = next;
    localStorage.setItem(DB_KEY, JSON.stringify(rest));
  } catch {
    // ストレージ容量超過時は永続化をスキップ（メモリ上では動作継続）
  }
}

export function getDB(): DB {
  if (!db) db = load();
  return db;
}

function commit(next: DB) {
  db = { ...next, hydrated: true };
  persist(db);
  emit();
}

/** Reactコンポーネントからストア全体を購読する */
export function useDB(): DB {
  return useSyncExternalStore(subscribe, getDB, () => SERVER_DB);
}

/** デモデータを初期状態に戻す */
export function resetDemoData() {
  commit(seedDemoData());
}

/** バックアップ用JSONエクスポート */
export function exportDataJSON(): string {
  const { hydrated: _hydrated, ...rest } = getDB();
  return JSON.stringify(rest, null, 2);
}

// ------------------------------------------------------------
// 案件
// ------------------------------------------------------------

export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;

export function addProject(input: ProjectInput): Project {
  const now = nowISO();
  const project: Project = { ...input, id: uid(), createdAt: now, updatedAt: now };
  const cur = getDB();
  commit({ ...cur, projects: [project, ...cur.projects] });
  return project;
}

export function updateProject(id: string, patch: Partial<ProjectInput>) {
  const cur = getDB();
  commit({
    ...cur,
    projects: cur.projects.map((p) =>
      p.id === id ? { ...p, ...patch, updatedAt: nowISO() } : p
    ),
  });
}

/** 案件削除（収支は削除、書類は「案件未割当」へ移動） */
export function removeProject(id: string) {
  const cur = getDB();
  commit({
    ...cur,
    projects: cur.projects.filter((p) => p.id !== id),
    revenues: cur.revenues.filter((r) => r.projectId !== id),
    costs: cur.costs.filter((c) => c.projectId !== id),
    documents: cur.documents.map((doc) =>
      doc.projectId === id
        ? { ...doc, projectId: null, registeredTo: null, updatedAt: nowISO() }
        : doc
    ),
    estimates: cur.estimates.map((e) => (e.projectId === id ? { ...e, projectId: null } : e)),
    invoices: cur.invoices.map((i) => (i.projectId === id ? { ...i, projectId: null } : i)),
  });
}

function touchProject(cur: DB, projectId: string | null): Project[] {
  if (!projectId) return cur.projects;
  return cur.projects.map((p) => (p.id === projectId ? { ...p, updatedAt: nowISO() } : p));
}

// ------------------------------------------------------------
// 売上
// ------------------------------------------------------------

export type RevenueInput = Omit<Revenue, "id" | "createdAt" | "updatedAt">;

export function addRevenue(input: RevenueInput): Revenue {
  const now = nowISO();
  const revenue: Revenue = { ...input, id: uid(), createdAt: now, updatedAt: now };
  const cur = getDB();
  commit({
    ...cur,
    revenues: [revenue, ...cur.revenues],
    projects: touchProject(cur, input.projectId),
  });
  return revenue;
}

export function updateRevenue(id: string, patch: Partial<RevenueInput>) {
  const cur = getDB();
  commit({
    ...cur,
    revenues: cur.revenues.map((r) =>
      r.id === id ? { ...r, ...patch, updatedAt: nowISO() } : r
    ),
  });
}

export function removeRevenue(id: string) {
  const cur = getDB();
  const target = cur.revenues.find((r) => r.id === id);
  commit({
    ...cur,
    revenues: cur.revenues.filter((r) => r.id !== id),
    documents: cur.documents.map((doc) =>
      target?.documentId === doc.id && doc.registeredTo?.id === id
        ? { ...doc, registeredTo: null, status: "needs_review", updatedAt: nowISO() }
        : doc
    ),
  });
}

// ------------------------------------------------------------
// 原価（発注費・材料費・経費）
// ------------------------------------------------------------

export type CostInput = Omit<Cost, "id" | "createdAt" | "updatedAt">;

export function addCost(input: CostInput): Cost {
  const now = nowISO();
  const cost: Cost = { ...input, id: uid(), createdAt: now, updatedAt: now };
  const cur = getDB();
  commit({
    ...cur,
    costs: [cost, ...cur.costs],
    projects: touchProject(cur, input.projectId),
  });
  return cost;
}

export function updateCost(id: string, patch: Partial<CostInput>) {
  const cur = getDB();
  commit({
    ...cur,
    costs: cur.costs.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: nowISO() } : c)),
  });
}

export function removeCost(id: string) {
  const cur = getDB();
  const target = cur.costs.find((c) => c.id === id);
  commit({
    ...cur,
    costs: cur.costs.filter((c) => c.id !== id),
    documents: cur.documents.map((doc) =>
      target?.documentId === doc.id && doc.registeredTo?.id === id
        ? { ...doc, registeredTo: null, status: "needs_review", updatedAt: nowISO() }
        : doc
    ),
  });
}

// ------------------------------------------------------------
// 書類
// ------------------------------------------------------------

export type DocumentInput = Omit<DocumentRec, "id" | "createdAt" | "updatedAt">;

export function addDocument(input: DocumentInput): DocumentRec {
  const now = nowISO();
  const doc: DocumentRec = { ...input, id: uid(), createdAt: now, updatedAt: now };
  const cur = getDB();
  commit({ ...cur, documents: [doc, ...cur.documents] });
  return doc;
}

export function updateDocument(id: string, patch: Partial<DocumentInput>) {
  const cur = getDB();
  commit({
    ...cur,
    documents: cur.documents.map((doc) =>
      doc.id === id ? { ...doc, ...patch, updatedAt: nowISO() } : doc
    ),
  });
}

export function removeDocument(id: string) {
  const cur = getDB();
  commit({
    ...cur,
    documents: cur.documents.filter((doc) => doc.id !== id),
    revenues: cur.revenues.map((r) => (r.documentId === id ? { ...r, documentId: null } : r)),
    costs: cur.costs.map((c) => (c.documentId === id ? { ...c, documentId: null } : c)),
  });
}

// ------------------------------------------------------------
// 見積・請求
// ------------------------------------------------------------

function nextNumber(prefix: string, existing: string[]): string {
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  for (const num of existing) {
    const m = num.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export type EstimateInput = Omit<Estimate, "id" | "estimateNumber" | "createdAt" | "updatedAt">;

export function addEstimate(input: EstimateInput): Estimate {
  const cur = getDB();
  const now = nowISO();
  const estimate: Estimate = {
    ...input,
    id: uid(),
    estimateNumber: nextNumber("EST", cur.estimates.map((e) => e.estimateNumber)),
    createdAt: now,
    updatedAt: now,
  };
  commit({ ...cur, estimates: [estimate, ...cur.estimates] });
  return estimate;
}

export function updateEstimate(id: string, patch: Partial<EstimateInput>) {
  const cur = getDB();
  commit({
    ...cur,
    estimates: cur.estimates.map((e) =>
      e.id === id ? { ...e, ...patch, updatedAt: nowISO() } : e
    ),
  });
}

export function removeEstimate(id: string) {
  const cur = getDB();
  commit({ ...cur, estimates: cur.estimates.filter((e) => e.id !== id) });
}

export type InvoiceInput = Omit<Invoice, "id" | "invoiceNumber" | "createdAt" | "updatedAt">;

export function addInvoice(input: InvoiceInput): Invoice {
  const cur = getDB();
  const now = nowISO();
  const invoice: Invoice = {
    ...input,
    id: uid(),
    invoiceNumber: nextNumber("INV", cur.invoices.map((i) => i.invoiceNumber)),
    createdAt: now,
    updatedAt: now,
  };
  commit({ ...cur, invoices: [invoice, ...cur.invoices] });
  return invoice;
}

export function updateInvoice(id: string, patch: Partial<InvoiceInput>) {
  const cur = getDB();
  commit({
    ...cur,
    invoices: cur.invoices.map((i) =>
      i.id === id ? { ...i, ...patch, updatedAt: nowISO() } : i
    ),
  });
}

export function removeInvoice(id: string) {
  const cur = getDB();
  commit({ ...cur, invoices: cur.invoices.filter((i) => i.id !== id) });
}

// ------------------------------------------------------------
// 会社・メンバー
// ------------------------------------------------------------

export function updateCompany(patch: Partial<Company>) {
  const cur = getDB();
  commit({ ...cur, company: { ...cur.company, ...patch } });
}

export function addMember(input: Omit<Member, "id" | "createdAt">): Member {
  const member: Member = { ...input, id: uid(), createdAt: nowISO() };
  const cur = getDB();
  commit({ ...cur, members: [...cur.members, member] });
  return member;
}

export function updateMember(id: string, patch: Partial<Omit<Member, "id" | "createdAt">>) {
  const cur = getDB();
  commit({
    ...cur,
    members: cur.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  });
}

export function removeMember(id: string) {
  const cur = getDB();
  commit({
    ...cur,
    members: cur.members.filter((m) => m.id !== id),
    projects: cur.projects.map((p) => (p.managerId === id ? { ...p, managerId: null } : p)),
  });
}

// ============================================================
// セッション（デモ / Supabase 共通の軽量セッション）
// ============================================================

let session: Session | null = null;
let sessionLoaded = false;

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  if (!sessionLoaded) {
    try {
      session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as Session | null;
    } catch {
      session = null;
    }
    sessionLoaded = true;
  }
  return session;
}

export function setSession(next: Session | null) {
  session = next;
  sessionLoaded = true;
  if (typeof window !== "undefined") {
    try {
      if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }
  emit();
}

/** デモモードでログインする */
export function startDemoSession(): Session {
  const s: Session = {
    name: "山田 太郎",
    email: "demo@genba-cloud.example.jp",
    role: "owner",
    mode: "demo",
  };
  setSession(s);
  return s;
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, () => null);
}
