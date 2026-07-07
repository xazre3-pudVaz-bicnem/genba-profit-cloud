import type { Confidence, DocumentType, OcrItem, OcrResult, PaymentMethod } from "./types";

// ============================================================
// OCR結果の正規化 + モック解析
// サーバー（APIルート）とクライアント（フォールバック）の両方で使う
// ============================================================

const DOC_TYPES: DocumentType[] = [
  "receipt",
  "receipt_official",
  "invoice",
  "estimate",
  "purchase_order",
  "delivery_note",
  "other",
];

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "credit", "transfer", "invoice", "other"];
const CONFIDENCES: Confidence[] = ["high", "medium", "low"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const n = Number(v.replace(/[,，¥￥\s円]/g, ""));
    if (Number.isFinite(n)) return Math.round(n);
  }
  return undefined;
}

function asDate(v: unknown): string | undefined {
  const s = asString(v);
  if (!s) return undefined;
  // "2026-07-06" / "2026/07/06" / "2026年7月6日" に対応
  const m = s.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (!m) return undefined;
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** AIの出力（unknown）を安全にOcrResultへ正規化する */
export function normalizeOcr(raw: unknown, fallbackType: DocumentType): OcrResult {
  const r = isRecord(raw) ? raw : {};
  const docTypeRaw = asString(r.documentType);
  const documentType = DOC_TYPES.includes(docTypeRaw as DocumentType)
    ? (docTypeRaw as DocumentType)
    : fallbackType;

  const paymentRaw = asString(r.paymentMethod);
  const paymentMethod = PAYMENT_METHODS.includes(paymentRaw as PaymentMethod)
    ? (paymentRaw as PaymentMethod)
    : undefined;

  const confRaw = asString(r.confidence);
  const confidence = CONFIDENCES.includes(confRaw as Confidence)
    ? (confRaw as Confidence)
    : "medium";

  const items: OcrItem[] = [];
  if (Array.isArray(r.items)) {
    for (const item of r.items.slice(0, 8)) {
      if (isRecord(item)) {
        const name = asString(item.name);
        if (name) items.push({ name, amount: asNumber(item.amount) });
      }
    }
  }

  const totalAmount = asNumber(r.totalAmount) ?? 0;

  return {
    documentType,
    vendorName: asString(r.vendorName) ?? "",
    documentDate: asDate(r.documentDate) ?? "",
    totalAmount,
    taxAmount: asNumber(r.taxAmount) ?? 0,
    items,
    paymentMethod,
    addressee: asString(r.addressee),
    registrationNumber: asString(r.registrationNumber),
    confidence,
    rawText: asString(r.rawText),
  };
}

// ------------------------------------------------------------
// モック解析（APIキー未設定時・接続失敗時のフォールバック）
// ------------------------------------------------------------

interface MockVendor {
  name: string;
  items: string[];
  min: number;
  max: number;
  payment: PaymentMethod;
}

const MOCK_VENDORS: Record<string, MockVendor[]> = {
  receipt: [
    { name: "コーナンPRO 練馬店", items: ["構造用合板 12mm", "垂木・胴縁材", "ビス・金物セット"], min: 8000, max: 86000, payment: "cash" },
    { name: "カインズ 練馬店", items: ["コーキング材", "養生テープ", "内装補修材"], min: 3000, max: 42000, payment: "credit" },
    { name: "建デポ 新宿店", items: ["石膏ボード", "パテ・副資材", "LGS材"], min: 12000, max: 160000, payment: "credit" },
    { name: "ENEOS セルフSS", items: ["レギュラーガソリン 45.2L"], min: 5000, max: 12000, payment: "credit" },
    { name: "タイムズパーキング", items: ["駐車料金"], min: 800, max: 4400, payment: "cash" },
  ],
  receipt_official: [
    { name: "エコ産業株式会社", items: ["産業廃棄物処分費"], min: 15000, max: 180000, payment: "cash" },
    { name: "首都高速道路", items: ["ETC利用料"], min: 1500, max: 8000, payment: "credit" },
  ],
  invoice: [
    { name: "佐藤設備工業", items: ["給排水設備工事一式"], min: 200000, max: 950000, payment: "transfer" },
    { name: "内装工房ナカムラ", items: ["クロス仕上げ工事", "床仕上げ工事"], min: 150000, max: 780000, payment: "invoice" },
    { name: "山川電気", items: ["電気配線工事一式"], min: 80000, max: 450000, payment: "invoice" },
  ],
  estimate: [
    { name: "東京足場サービス", items: ["足場架設・解体工事"], min: 250000, max: 680000, payment: "transfer" },
  ],
  purchase_order: [
    { name: "塗装テクノ", items: ["外壁塗装工事（手間請け）"], min: 300000, max: 900000, payment: "invoice" },
  ],
  delivery_note: [
    { name: "クリナップ", items: ["システムキッチン部材一式"], min: 180000, max: 620000, payment: "transfer" },
  ],
  other: [
    { name: "現場サプライ", items: ["消耗品各種"], min: 3000, max: 30000, payment: "cash" },
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** モックのOCR結果を生成する（書類種別に応じた自然な内容） */
export function mockOcrResult(hint?: DocumentType): OcrResult {
  const type: DocumentType = hint && DOC_TYPES.includes(hint) ? hint : "receipt";
  const vendors = MOCK_VENDORS[type] ?? MOCK_VENDORS.receipt;
  const vendor = pick(vendors);
  const total = Math.round((vendor.min + Math.random() * (vendor.max - vendor.min)) / 100) * 100;
  const tax = Math.round((total * 10) / 110);

  const daysAgo = Math.floor(Math.random() * 3);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

  const items: OcrItem[] =
    vendor.items.length === 1
      ? [{ name: vendor.items[0], amount: total }]
      : vendor.items.map((name, i) => ({
          name,
          amount: i === 0 ? Math.round(total * 0.5) : Math.round((total * 0.5) / (vendor.items.length - 1)),
        }));

  return {
    documentType: type,
    vendorName: vendor.name,
    documentDate: dateStr,
    totalAmount: total,
    taxAmount: tax,
    items,
    paymentMethod: vendor.payment,
    registrationNumber: type === "invoice" ? "T9876543210987" : undefined,
    confidence: "medium",
    rawText: `${vendor.name}\n${items.map((i) => i.name).join("\n")}\n合計 ¥${total.toLocaleString("ja-JP")}`,
  };
}
