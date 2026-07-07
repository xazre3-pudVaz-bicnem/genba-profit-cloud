import type {
  CostStatus,
  CostType,
  DocumentStatus,
  DocumentType,
  EstimateStatus,
  ExpenseCategory,
  InvoiceStatus,
  PaymentMethod,
  ProjectStatus,
  RevenueStatus,
  Role,
} from "./types";

// ============================================================
// アプリ（管理システム）専用の定数
// ステータス定義・カテゴリ・警告しきい値など
// ============================================================

interface StatusMeta {
  label: string;
  badge: string; // Badge用クラス
  dot: string; // ドット用クラス
}

export const PROJECT_STATUSES: Record<ProjectStatus, StatusMeta> = {
  estimate: {
    label: "見積中",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  ordered: {
    label: "受注",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "施工中",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  completed: {
    label: "完了",
    badge: "bg-teal-50 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
  },
  invoiced: {
    label: "請求済",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
  paid: {
    label: "入金済",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  lost: {
    label: "失注",
    badge: "bg-neutral-100 text-neutral-500 border-neutral-200",
    dot: "bg-neutral-400",
  },
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "estimate",
  "ordered",
  "in_progress",
  "completed",
  "invoiced",
  "paid",
  "lost",
];

/** 案件ボードのカラム（失注は除く） */
export const BOARD_STATUSES: ProjectStatus[] = [
  "estimate",
  "ordered",
  "in_progress",
  "completed",
  "invoiced",
  "paid",
];

export const REVENUE_STATUSES: Record<RevenueStatus, StatusMeta> = {
  unbilled: {
    label: "未請求",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  billed: {
    label: "請求済",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  paid: {
    label: "入金済",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
};

export const COST_STATUSES: Record<CostStatus, StatusMeta> = {
  unpaid: {
    label: "未払い",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  paid: {
    label: "支払済",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
};

export const COST_TYPES: Record<CostType, { label: string; shortLabel: string; badge: string }> = {
  order: {
    label: "発注費（外注・協力会社）",
    shortLabel: "発注費",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  material: {
    label: "材料費",
    shortLabel: "材料費",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  expense: {
    label: "その他経費",
    shortLabel: "経費",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  parking: "駐車場代",
  travel: "交通費",
  highway: "高速代",
  fuel: "ガソリン代",
  tools: "工具",
  consumables: "消耗品",
  disposal: "産廃処分費",
  site_misc: "現場雑費",
  other: "その他",
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  cash: "現金",
  credit: "クレジットカード",
  transfer: "振込",
  invoice: "請求書払い",
  other: "その他",
};

export const DOCUMENT_TYPES: Record<DocumentType, string> = {
  receipt: "レシート",
  receipt_official: "領収書",
  invoice: "請求書",
  estimate: "見積書",
  purchase_order: "発注書",
  delivery_note: "納品書",
  other: "その他",
};

export const DOCUMENT_STATUSES: Record<DocumentStatus, StatusMeta> = {
  pending: {
    label: "解析待ち",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  analyzed: {
    label: "解析済み",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  needs_review: {
    label: "確認待ち",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  registered: {
    label: "登録済み",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  attention: {
    label: "要確認",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

export const ESTIMATE_STATUSES: Record<EstimateStatus, StatusMeta> = {
  draft: {
    label: "下書き",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  sent: {
    label: "提出済",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  accepted: {
    label: "受注",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  lost: {
    label: "失注",
    badge: "bg-neutral-100 text-neutral-500 border-neutral-200",
    dot: "bg-neutral-400",
  },
};

export const INVOICE_STATUSES: Record<InvoiceStatus, StatusMeta> = {
  draft: {
    label: "下書き",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  sent: {
    label: "請求済",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  paid: {
    label: "入金済",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
};

/** 期限超過バッジ（請求書の導出ステータス） */
export const OVERDUE_BADGE = "bg-red-50 text-red-700 border-red-200";

export const ROLES: Record<Role, { label: string; description: string }> = {
  owner: { label: "オーナー", description: "すべての操作・契約管理が可能" },
  admin: { label: "管理者", description: "案件・収支・メンバーの管理が可能" },
  staff: { label: "スタッフ", description: "案件の閲覧・書類登録・収支入力が可能" },
  viewer: { label: "閲覧のみ", description: "データの閲覧のみ可能" },
};

export const PROJECT_COLORS = [
  "#F97316", // orange
  "#3B82F6", // blue
  "#10B981", // emerald
  "#8B5CF6", // violet
  "#F43F5E", // rose
  "#F59E0B", // amber
  "#06B6D4", // cyan
  "#64748B", // slate
];

/** 利益率の警告しきい値 */
export const PROFIT_WARN_RATE = 20; // 20%未満は警告
export const PROFIT_GOOD_RATE = 30; // 30%以上は良好
