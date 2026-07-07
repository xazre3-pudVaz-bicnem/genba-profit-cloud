// ============================================================
// 料金プラン定義（課金まわりの単一ソース）
//
// - LP（/pricing）とアプリの両方からここを参照する
// - 価格・上限の変更はこのファイルだけで完結させる
// - Stripe接続時は stripePriceId に本番のPrice IDを設定する
//   （NEXT_PUBLIC_STRIPE_PRICE_〇〇 環境変数があれば優先）
// ============================================================

export type PlanId = "light" | "standard" | "pro";

export interface BillingPlan {
  id: PlanId;
  name: string;
  /** 月額（税別・円） */
  price: number;
  unit: string;
  description: string;
  features: string[];
  highlighted: boolean;
  /** プラン上限（アプリ側の制限実装で使用） */
  limits: {
    members: number;
    documentsPerMonth: number;
    ocr: boolean;
    estimatesInvoices: boolean;
    prioritySupport: boolean;
  };
  /** StripeのPrice ID（未接続時はnull） */
  stripePriceId: string | null;
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "light",
    name: "ライト",
    price: 9800,
    unit: "月額（税別）",
    description: "一人親方・少人数の事業者向け",
    features: [
      "案件管理",
      "売上・原価管理",
      "利益率の自動計算",
      "書類アップロード 月50枚まで",
      "1ユーザー",
    ],
    highlighted: false,
    limits: {
      members: 1,
      documentsPerMonth: 50,
      ocr: false,
      estimatesInvoices: false,
      prioritySupport: false,
    },
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LIGHT || null,
  },
  {
    id: "standard",
    name: "スタンダード",
    price: 19800,
    unit: "月額（税別）",
    description: "工務店・工事会社の定番プラン",
    features: [
      "ライトの全機能",
      "AI OCR読み取り（レシート・請求書）",
      "見積書・請求書の作成/PDF発行",
      "メンバー3名まで",
      "書類アップロード 月300枚まで",
    ],
    highlighted: true,
    limits: {
      members: 3,
      documentsPerMonth: 300,
      ocr: true,
      estimatesInvoices: true,
      prioritySupport: false,
    },
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD || null,
  },
  {
    id: "pro",
    name: "プロ",
    price: 39800,
    unit: "月額（税別）",
    description: "複数拠点・多案件を扱う会社向け",
    features: [
      "スタンダードの全機能",
      "メンバー10名まで",
      "書類アップロード 月1,000枚まで",
      "優先サポート",
    ],
    highlighted: false,
    limits: {
      members: 10,
      documentsPerMonth: 1000,
      ocr: true,
      estimatesInvoices: true,
      prioritySupport: true,
    },
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || null,
  },
];

export const DEFAULT_PLAN_ID: PlanId = "standard";

export function isPlanId(value: string | null | undefined): value is PlanId {
  return value === "light" || value === "standard" || value === "pro";
}

export function getPlan(id: string | null | undefined): BillingPlan | null {
  return BILLING_PLANS.find((p) => p.id === id) ?? null;
}
