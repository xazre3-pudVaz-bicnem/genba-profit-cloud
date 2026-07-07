// ============================================================
// ドメイン型定義（Supabaseテーブルと1:1対応）
// ============================================================

export type ProjectStatus =
  | "estimate" // 見積中
  | "ordered" // 受注
  | "in_progress" // 施工中
  | "completed" // 完了
  | "invoiced" // 請求済
  | "paid" // 入金済
  | "lost"; // 失注

export type TaxType = "inclusive" | "exclusive" | "none"; // 税込 / 税別 / 非課税
export type RevenueStatus = "unbilled" | "billed" | "paid"; // 未請求 / 請求済 / 入金済
export type CostType = "order" | "material" | "expense"; // 発注費 / 材料費 / その他経費
export type CostStatus = "unpaid" | "paid"; // 未払い / 支払済
export type PaymentMethod = "cash" | "credit" | "transfer" | "invoice" | "other";

export type ExpenseCategory =
  | "parking"
  | "travel"
  | "highway"
  | "fuel"
  | "tools"
  | "consumables"
  | "disposal"
  | "site_misc"
  | "other";

export type DocumentType =
  | "receipt" // レシート
  | "receipt_official" // 領収書
  | "invoice" // 請求書
  | "estimate" // 見積書
  | "purchase_order" // 発注書
  | "delivery_note" // 納品書
  | "other";

export type DocumentStatus =
  | "pending" // 解析待ち
  | "analyzed" // 解析済み
  | "needs_review" // 確認待ち
  | "registered" // 登録済み
  | "attention"; // 要確認

export type EstimateStatus = "draft" | "sent" | "accepted" | "lost";
export type InvoiceStatus = "draft" | "sent" | "paid"; // 期限超過は導出
export type Role = "owner" | "admin" | "staff" | "viewer";
export type Confidence = "high" | "medium" | "low";

/** OCR確認画面での登録先 */
export type RegisterTarget = "material" | "order" | "expense" | "revenue" | "none";

// ------------------------------------------------------------

export interface Company {
  id: string;
  name: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  invoiceRegistrationNumber: string;
  bankName: string;
  bankBranch: string;
  bankAccountType: string; // 普通 / 当座
  bankAccountNumber: string;
  bankAccountHolder: string;
  logoUrl: string | null;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  /** 最終更新日（Supabase接続時のみ。デモデータは未設定） */
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  customerName: string;
  siteAddress: string;
  managerId: string | null;
  status: ProjectStatus;
  startDate: string | null; // 開始予定日 (YYYY-MM-DD)
  dueDate: string | null; // 完了予定日
  completedDate: string | null; // 実完了日
  memo: string;
  tags: string[];
  color: string; // HEX
  createdAt: string;
  updatedAt: string;
}

export interface Revenue {
  id: string;
  projectId: string;
  title: string;
  /** 税込合計額（集計はすべてこの値で行う） */
  amount: number;
  taxType: TaxType;
  taxAmount: number;
  billingDueDate: string | null; // 請求予定日
  billedDate: string | null; // 請求日
  paymentDueDate: string | null; // 入金予定日
  paidDate: string | null; // 入金日
  status: RevenueStatus;
  memo: string;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Cost {
  id: string;
  projectId: string;
  type: CostType;
  vendorName: string; // 発注先 / 購入先
  title: string; // 内容 / 品目
  category: ExpenseCategory | null; // 経費のみ
  /** 税込合計額 */
  amount: number;
  taxType: TaxType;
  taxAmount: number;
  paymentMethod: PaymentMethod | null;
  purchaseDate: string | null; // 購入日
  paymentDueDate: string | null; // 支払予定日
  paidDate: string | null; // 支払日
  status: CostStatus;
  memo: string;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OcrItem {
  name: string;
  amount?: number;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
}

export interface OcrResult {
  documentType: DocumentType;
  vendorName: string;
  customerName?: string; // 宛名・請求先
  documentDate: string; // YYYY-MM-DD
  dueDate?: string | null; // 支払期限
  invoiceNumber?: string | null; // 請求書番号
  totalAmount: number;
  taxAmount: number;
  subtotal?: number | null; // 税抜小計
  items: OcrItem[];
  paymentMethod?: PaymentMethod;
  addressee?: string; // 宛名（customerNameの別名・後方互換）
  registrationNumber?: string; // インボイス登録番号
  /** AIが推定した登録先（売上/発注費/材料費/経費/書類のみ） */
  suggestedTarget?: RegisterTarget;
  /** AIが推定した経費カテゴリ（登録先が経費のとき） */
  suggestedCategory?: ExpenseCategory | null;
  confidence: Confidence;
  rawText?: string;
}

export interface DocumentRec {
  id: string;
  projectId: string | null; // null = 案件未割当
  uploadedBy: string; // メンバー名
  documentType: DocumentType;
  fileUrl: string | null;
  thumbnailUrl: string | null; // dataURL（デモ時）
  vendorName: string;
  documentDate: string | null;
  totalAmount: number | null;
  taxAmount: number | null;
  ocrText: string;
  ai: OcrResult | null;
  assignmentConfidence: Confidence | null;
  status: DocumentStatus;
  /** 登録済みの場合、反映先レコード */
  registeredTo: { kind: "cost" | "revenue"; id: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export interface Estimate {
  id: string;
  projectId: string | null;
  estimateNumber: string;
  customerName: string;
  title: string;
  items: LineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  issueDate: string | null;
  validUntil: string | null;
  status: EstimateStatus;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  projectId: string | null;
  invoiceNumber: string;
  customerName: string;
  title: string;
  items: LineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  invoiceDate: string | null; // 請求日
  dueDate: string | null; // 支払期限
  paidDate: string | null; // 入金日
  status: InvoiceStatus;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

/** デモモードのローカルDB全体 */
export interface DB {
  company: Company;
  members: Member[];
  projects: Project[];
  revenues: Revenue[];
  costs: Cost[];
  documents: DocumentRec[];
  estimates: Estimate[];
  invoices: Invoice[];
  hydrated: boolean;
}

export interface Session {
  name: string;
  email: string;
  role: Role;
  mode: "demo" | "supabase";
}
