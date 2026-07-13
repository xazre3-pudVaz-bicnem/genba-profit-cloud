import { PROFIT_GOOD_RATE, PROFIT_WARN_RATE } from "./constants";
import { currentMonthKey, isOverdue, localDateOf, monthKey } from "../shared/format";
import type { Cost, DB, DocumentRec, Invoice, Project, Revenue } from "./types";

// ============================================================
// 収支の自動計算（すべての画面でこの関数群を使う）
// 金額はすべて税込合計 amount ベースで集計する
// ============================================================

export interface ProjectFinance {
  revenueTotal: number; // 売上合計
  orderTotal: number; // 発注費合計
  materialTotal: number; // 材料費合計
  expenseTotal: number; // その他経費合計
  costTotal: number; // 原価合計
  profit: number; // 粗利益
  profitRate: number | null; // 利益率（売上0はnull）
  unbilled: number; // 未請求額
  unpaidReceivable: number; // 未入金額（請求済かつ入金日なし）
  unpaidCost: number; // 未払い額
  docCount: number; // 書類数
  pendingDocCount: number; // 確認待ち・要確認の書類数
  hasRevenue: boolean;
  hasCost: boolean;
  isDeficit: boolean; // 赤字
  isLowProfit: boolean; // 利益率20%未満
  isGoodProfit: boolean; // 利益率30%以上
  costOnly: boolean; // 原価だけ登録されている（注意表示）
}

/** 売上・原価・書類の配列から収支を計算する */
export function computeFinance(
  revenues: Revenue[],
  costs: Cost[],
  documents: DocumentRec[]
): ProjectFinance {
  const revenueTotal = sum(revenues.map((r) => r.amount));
  const orderTotal = sum(costs.filter((c) => c.type === "order").map((c) => c.amount));
  const materialTotal = sum(costs.filter((c) => c.type === "material").map((c) => c.amount));
  const expenseTotal = sum(costs.filter((c) => c.type === "expense").map((c) => c.amount));
  const costTotal = orderTotal + materialTotal + expenseTotal;
  const profit = revenueTotal - costTotal;
  const profitRate = revenueTotal > 0 ? (profit / revenueTotal) * 100 : null;

  const unbilled = sum(revenues.filter((r) => r.status === "unbilled").map((r) => r.amount));
  const unpaidReceivable = sum(
    revenues.filter((r) => r.status === "billed" && !r.paidDate).map((r) => r.amount)
  );
  const unpaidCost = sum(costs.filter((c) => c.status === "unpaid").map((c) => c.amount));

  const pendingDocCount = documents.filter(
    (d) => d.status === "needs_review" || d.status === "attention" || d.status === "pending"
  ).length;

  const hasRevenue = revenues.length > 0;
  const hasCost = costs.length > 0;

  return {
    revenueTotal,
    orderTotal,
    materialTotal,
    expenseTotal,
    costTotal,
    profit,
    profitRate,
    unbilled,
    unpaidReceivable,
    unpaidCost,
    docCount: documents.length,
    pendingDocCount,
    hasRevenue,
    hasCost,
    isDeficit: hasRevenue && profit < 0,
    isLowProfit: profitRate !== null && profitRate >= 0 && profitRate < PROFIT_WARN_RATE,
    isGoodProfit: profitRate !== null && profitRate >= PROFIT_GOOD_RATE,
    costOnly: !hasRevenue && hasCost,
  };
}

/** 案件IDから収支を計算する */
export function projectFinance(projectId: string, db: DB): ProjectFinance {
  return computeFinance(
    db.revenues.filter((r) => r.projectId === projectId),
    db.costs.filter((c) => c.projectId === projectId),
    db.documents.filter((d) => d.projectId === projectId)
  );
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

// ------------------------------------------------------------
// 計上月の判定
// 売上: 請求日 → 入金日 → 請求予定日 → 作成日 の順で採用
// 原価: 購入日 → 支払日 → 支払予定日 → 作成日 の順で採用
// ------------------------------------------------------------

export function revenueAccrualDate(r: Revenue): string {
  return r.billedDate || r.paidDate || r.billingDueDate || localDateOf(r.createdAt);
}

export function costAccrualDate(c: Cost): string {
  return c.purchaseDate || c.paidDate || c.paymentDueDate || localDateOf(c.createdAt);
}

/** 請求書の期限超過判定（請求済かつ支払期限を過ぎている） */
export function invoiceIsOverdue(inv: Invoice): boolean {
  return inv.status === "sent" && isOverdue(inv.dueDate);
}

// ------------------------------------------------------------
// ダッシュボード集計
// ------------------------------------------------------------

export interface DashboardStats {
  monthRevenue: number;
  monthOrder: number;
  monthMaterial: number;
  monthExpense: number;
  monthCost: number;
  monthProfit: number;
  monthProfitRate: number | null;
  totalUnbilled: number;
  totalUnpaidReceivable: number;
  activeProjectCount: number; // 進行中（受注・施工中）
  completedProjectCount: number; // 完了以降
  deficitProjectCount: number; // 赤字案件
  lowProfitProjectCount: number; // 利益率20%未満
  unconfirmedDocCount: number; // 未確認書類
}

export function dashboardStats(db: DB): DashboardStats {
  const month = currentMonthKey();

  const monthRevenues = db.revenues.filter((r) => monthKey(revenueAccrualDate(r)) === month);
  const monthCosts = db.costs.filter((c) => monthKey(costAccrualDate(c)) === month);

  const monthRevenue = sum(monthRevenues.map((r) => r.amount));
  const monthOrder = sum(monthCosts.filter((c) => c.type === "order").map((c) => c.amount));
  const monthMaterial = sum(monthCosts.filter((c) => c.type === "material").map((c) => c.amount));
  const monthExpense = sum(monthCosts.filter((c) => c.type === "expense").map((c) => c.amount));
  const monthCost = monthOrder + monthMaterial + monthExpense;
  const monthProfit = monthRevenue - monthCost;

  let deficit = 0;
  let lowProfit = 0;
  for (const p of db.projects) {
    if (p.status === "lost") continue;
    const fin = projectFinance(p.id, db);
    if (fin.isDeficit) deficit += 1;
    else if (fin.isLowProfit) lowProfit += 1;
  }

  return {
    monthRevenue,
    monthOrder,
    monthMaterial,
    monthExpense,
    monthCost,
    monthProfit,
    monthProfitRate: monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : null,
    totalUnbilled: sum(db.revenues.filter((r) => r.status === "unbilled").map((r) => r.amount)),
    totalUnpaidReceivable: sum(
      db.revenues.filter((r) => r.status === "billed" && !r.paidDate).map((r) => r.amount)
    ),
    activeProjectCount: db.projects.filter(
      (p) => p.status === "ordered" || p.status === "in_progress"
    ).length,
    completedProjectCount: db.projects.filter(
      (p) => p.status === "completed" || p.status === "invoiced" || p.status === "paid"
    ).length,
    deficitProjectCount: deficit,
    lowProfitProjectCount: lowProfit,
    unconfirmedDocCount: db.documents.filter(
      (d) => d.status === "needs_review" || d.status === "attention" || d.status === "pending"
    ).length,
  };
}

// ------------------------------------------------------------
// 月別の集計（案件一覧の月表示用）
// 計上月の判定は revenueAccrualDate / costAccrualDate に集約してあり、
// 将来「会計月／施工月」の切り替えもこの関数群の差し替えだけで対応できる
// ------------------------------------------------------------

export interface MonthSummary {
  revenueTotal: number;
  costTotal: number;
  profit: number;
  /** 売上0の月はnull（画面では「—」表示） */
  profitRate: number | null;
}

/** 対象月（"YYYY-MM"）の売上・原価・利益を集計する */
export function monthSummary(db: DB, month: string): MonthSummary {
  const revenueTotal = sum(
    db.revenues.filter((r) => monthKey(revenueAccrualDate(r)) === month).map((r) => r.amount)
  );
  const costTotal = sum(
    db.costs.filter((c) => monthKey(costAccrualDate(c)) === month).map((c) => c.amount)
  );
  const profit = revenueTotal - costTotal;
  return {
    revenueTotal,
    costTotal,
    profit,
    profitRate: revenueTotal > 0 ? (profit / revenueTotal) * 100 : null,
  };
}

/**
 * 対象月に関係する案件を返す。
 * 開始・完了予定・実完了・作成のいずれかの月が一致するもの、
 * 工期（開始月〜完了/完了予定月）が対象月にかかっているもの、
 * または収支の計上月が一致するもの。
 */
export function projectsForMonth(db: DB, month: string): Project[] {
  // 収支の計上月を案件ごとに1パスで集計（案件×収支の全走査を避ける）
  const accrualMonths = new Map<string, Set<string>>();
  const record = (projectId: string, m: string) => {
    const set = accrualMonths.get(projectId) ?? new Set<string>();
    set.add(m);
    accrualMonths.set(projectId, set);
  };
  for (const r of db.revenues) record(r.projectId, monthKey(revenueAccrualDate(r)));
  for (const c of db.costs) record(c.projectId, monthKey(costAccrualDate(c)));

  return db.projects.filter((p) => {
    // いずれかの日付の月が一致
    const anchors = [localDateOf(p.createdAt), p.startDate, p.dueDate, p.completedDate];
    if (anchors.some((d) => d && monthKey(d) === month)) return true;
    // 工期が対象月にかかっている
    const start = p.startDate ? monthKey(p.startDate) : null;
    const end = p.completedDate ? monthKey(p.completedDate) : p.dueDate ? monthKey(p.dueDate) : null;
    if (start && end && start <= month && month <= end) return true;
    // 収支の計上月が一致
    return accrualMonths.get(p.id)?.has(month) ?? false;
  });
}

// ------------------------------------------------------------
// 月次推移（ダッシュボードのチャート用）
// ------------------------------------------------------------

export interface MonthlyPoint {
  key: string; // YYYY-MM
  revenue: number;
  cost: number;
  profit: number;
}

export function monthlySeries(db: DB, months = 6): MonthlyPoint[] {
  const now = new Date();
  const points: MonthlyPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const revenue = sum(
      db.revenues.filter((r) => monthKey(revenueAccrualDate(r)) === key).map((r) => r.amount)
    );
    const cost = sum(
      db.costs.filter((c) => monthKey(costAccrualDate(c)) === key).map((c) => c.amount)
    );
    points.push({ key, revenue, cost, profit: revenue - cost });
  }
  return points;
}
