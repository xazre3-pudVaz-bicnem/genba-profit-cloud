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
// サービス名（正式名称はあとで変更可能。envで上書きできる）
// ============================================================
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "現場収支クラウド";
export const APP_TAGLINE = "案件別収支管理クラウド";
export const APP_DESCRIPTION =
  "建設・内装・設備・リフォームなど現場系事業者のための案件別収支管理SaaS。レシートや請求書を写真でアップロードするだけで、案件ごとの売上・材料費・外注費・利益率を自動集計します。";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const TAX_RATE = 0.1;

// ============================================================
// ステータス定義（バッジ用クラスは静的文字列で保持）
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

// ============================================================
// 料金プラン（あとで変更しやすいようにここで一元管理）
// ============================================================
export interface Plan {
  id: string;
  name: string;
  price: number;
  unit: string;
  description: string;
  features: string[];
  highlighted: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "light",
    name: "ライト",
    price: 9800,
    unit: "月額（税別）",
    description: "一人親方・少人数の事業者向け",
    features: [
      "案件数 30件まで",
      "ユーザー 3名まで",
      "AI読み取り 月100枚",
      "案件別の収支・利益率管理",
      "書類の保管・検索",
      "スマホアプリ利用",
    ],
    highlighted: false,
  },
  {
    id: "standard",
    name: "スタンダード",
    price: 19800,
    unit: "月額（税別）",
    description: "5〜20名規模の工務店・工事会社向け",
    features: [
      "案件数 無制限",
      "ユーザー 10名まで",
      "AI読み取り 月500枚",
      "見積書・請求書のPDF発行",
      "案件ボード・カレンダー",
      "未請求・未入金アラート",
      "メールサポート",
    ],
    highlighted: true,
  },
  {
    id: "pro",
    name: "プロ",
    price: 39800,
    unit: "月額（税別）",
    description: "複数拠点・多案件を扱う会社向け",
    features: [
      "案件数 無制限",
      "ユーザー 無制限",
      "AI読み取り 無制限",
      "権限のカスタマイズ",
      "CSVエクスポート",
      "会計ソフト連携（順次対応）",
      "優先サポート",
    ],
    highlighted: false,
  },
];

// ============================================================
// FAQ（LP・料金ページで共用）
// ============================================================
export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "スマホだけで使えますか？",
    a: "はい、スマホだけで使えます。現場でレシートを撮影してアップロードし、案件を選んで保存するまで3タップ程度で完了します。事務所のPCからは管理画面として大きな画面で確認できます。",
  },
  {
    q: "レシートの読み取り精度はどのくらいですか？",
    a: "AIが金額・日付・取引先・品目を自動で読み取ります。読み取り結果は必ず確認画面でチェックしてから登録する仕組みのため、間違った金額がそのまま登録される心配はありません。読み取れなかった場合も手入力で登録できます。",
  },
  {
    q: "案件ごとに利益を見られますか？",
    a: "はい。案件ごとに売上・発注費・材料費・経費を自動集計し、粗利益と利益率をリアルタイムに表示します。利益率20%未満の案件や赤字案件は自動で警告表示されます。",
  },
  {
    q: "見積書や請求書は作れますか？",
    a: "はい。案件に紐づけて見積書・請求書を作成し、A4のPDFとして出力できます。会社ロゴ・インボイス登録番号・振込先も設定できます。",
  },
  {
    q: "Excelから移行できますか？",
    a: "案件情報はフォームからすぐに登録できます。過去案件の一括インポート（CSV）にも順次対応予定です。まずは進行中の案件から使い始めるお客様が多いです。",
  },
  {
    q: "一人親方でも使えますか？",
    a: "はい、一人親方のお客様にこそおすすめです。日中は現場、夜に事務作業という方でも、レシートを撮るだけで経費管理が終わるため、月末の集計作業がほぼゼロになります。",
  },
  {
    q: "会計ソフトとの違いは何ですか？",
    a: "会計ソフトは会社全体の経理・申告のためのツールですが、本サービスは「案件ごとの利益」を見るための現場特化ツールです。勘定科目の知識は不要で、現場の人がそのまま使える言葉で設計されています。",
  },
  {
    q: "会計ソフトと連携できますか？",
    a: "freee・マネーフォワードなど主要会計ソフトとのCSV連携を順次対応予定です。登録したデータはエクスポートして会計処理にご利用いただけます。",
  },
];

/** 対象業種（LP用） */
export const INDUSTRIES = [
  { name: "内装工事", example: "クロス・床・造作の材料費と職人手間を案件別に管理" },
  { name: "リフォーム", example: "追加工事で膨らみがちな原価をリアルタイムに把握" },
  { name: "設備工事", example: "機器仕入と施工外注を分けて粗利を自動計算" },
  { name: "電気工事", example: "電材の細かいレシートを写真で撮るだけで集計" },
  { name: "外構工事", example: "資材・重機・外注の費用を現場ごとに見える化" },
  { name: "原状回復", example: "短工期・多案件でも請求漏れゼロへ" },
  { name: "水道工事", example: "緊急対応の領収書もその場で登録、あとから整理不要" },
  { name: "小規模工務店", example: "全現場の利益率を一覧で比較、赤字現場を早期発見" },
];
