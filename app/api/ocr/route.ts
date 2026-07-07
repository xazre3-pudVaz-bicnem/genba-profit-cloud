import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { mockOcrResult, normalizeOcr } from "@/lib/app/ocr-shared";
import type { DocumentType, OcrResult } from "@/lib/app/types";

// ============================================================
// AI OCR APIルート（本実装）
//
// 入力（いずれか）:
//   - filePath + Authorization: Supabase Storageから原本を取得して解析
//     （documentId付きなら解析結果をdocumentsテーブルへ保存）
//   - image(base64) + mimeType: クライアント縮小画像を直接解析（フォールバック）
//
// 優先順位: Claude Vision → OpenAI Vision → モック解析
// APIキーはサーバー側でのみ使用し、クライアントへは一切渡さない。
// どんな失敗でも必ず200でモック結果を返し、手入力登録に進める。
// ============================================================

export const runtime = "nodejs";
export const maxDuration = 60;

const DOC_TYPES: DocumentType[] = [
  "receipt",
  "receipt_official",
  "invoice",
  "estimate",
  "purchase_order",
  "delivery_note",
  "other",
];

// AIに渡す指示（日本の建設業向け・JSONのみを要求）
const SYSTEM_PROMPT = `あなたは日本の建設業・工事業向けの書類OCRアシスタントです。
アップロードされたレシート・領収書・請求書・見積書・発注書・納品書を読み取り、案件別収支管理に必要な情報を抽出してください。

特に以下を重視してください。
・取引先名（発行者）
・日付
・合計金額（税込）
・消費税額
・品目
・支払方法
・インボイス登録番号
・請求書番号
・支払期限
・書類種別
・売上 / 発注費 / 材料費 / 経費 / 書類のみ のどれに登録すべきか

登録先の判定ルール:
・ホームセンター、建材店、金物店、資材店のレシートは material を優先
・ガソリンスタンドは expense、カテゴリはガソリン代
・駐車場、タイムズ、パーキングは expense、カテゴリは駐車場代
・高速道路、ETCは expense、カテゴリは高速代
・協力会社、施工会社、工業会社、設備会社からの請求書は order を優先
・自社が発行した請求書らしい場合（宛名が施主・元請）は revenue
・判断できない場合は document_only
・金額や日付に自信がない場合は confidence を low にする

必ずJSONのみを返してください。説明文・Markdown・コードブロックは返さないでください。`;

const JSON_SPEC = `次のJSON形式だけで出力してください。

{
  "document_type": "receipt | receipt_official | invoice | estimate | order | delivery | other",
  "vendor_name": "取引先名（発行者）",
  "customer_name": "宛名または請求先（なければnull）",
  "document_date": "YYYY-MM-DD（読み取れなければnull）",
  "due_date": "支払期限 YYYY-MM-DD または null",
  "invoice_number": "請求書番号 または null",
  "registration_number": "インボイス登録番号（Tから始まる14桁）または null",
  "total_amount": 46200,
  "tax_amount": 4200,
  "subtotal": 42000,
  "payment_method": "cash | credit_card | bank_transfer | invoice | unknown",
  "line_items": [
    { "name": "品目名", "quantity": 1, "unit": "式", "unit_price": 42000, "amount": 42000 }
  ],
  "suggested_entry_type": "revenue | order | material | expense | document_only",
  "suggested_cost_category": "材料費 | 駐車場代 | ガソリン代 | 高速代 | 工具 | 消耗品 | 外注費 | その他",
  "confidence": "high | medium | low",
  "raw_text": "読み取った主要なテキスト（10行以内）"
}

数値は必ずnumber型で、カンマや円マークを含めないでください。
読み取れない項目はnullにしてください。合計金額が読み取れない場合は total_amount を null にしてください。`;

type ImageMedia = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

interface OcrSource {
  kind: "image" | "pdf";
  base64: string;
  mediaType: ImageMedia | "application/pdf";
}

function mediaTypeFromPath(path: string): OcrSource["mediaType"] {
  const ext = path.toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/)?.[1] ?? "";
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "pdf":
      return "application/pdf";
    default:
      return "image/jpeg";
  }
}

function toImageMedia(mime: string | undefined): ImageMedia {
  switch (mime) {
    case "image/png":
      return "image/png";
    case "image/gif":
      return "image/gif";
    case "image/webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("no JSON in response");
  return JSON.parse(text.slice(start, end + 1));
}

// ------------------------------------------------------------
// Supabase（ユーザーJWTスコープ。RLSが効くため他社データは扱えない）
// ------------------------------------------------------------

function userScopedClient(authHeader: string | null): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !authHeader?.startsWith("Bearer ")) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
}

/** Storageから原本を取得してOCR入力へ変換する */
async function loadFromStorage(sb: SupabaseClient, filePath: string): Promise<OcrSource> {
  const { data, error } = await sb.storage.from("documents").download(filePath);
  if (error || !data) throw new Error(`storage download failed: ${error?.message ?? "no data"}`);
  const buf = Buffer.from(await data.arrayBuffer());
  const mediaType = mediaTypeFromPath(filePath);
  if (mediaType === "application/pdf") {
    return { kind: "pdf", base64: buf.toString("base64"), mediaType };
  }
  // Claude Vision APIの画像上限（5MB）に対する安全マージン
  if (buf.length > 4_500_000) throw new Error("image too large for vision api");
  return { kind: "image", base64: buf.toString("base64"), mediaType };
}

/** OCR成功時にdocumentsテーブルへ結果を保存する（失敗しても致命的でない） */
async function persistToDocument(
  sb: SupabaseClient,
  documentId: string,
  result: OcrResult
): Promise<void> {
  const { error } = await sb
    .from("documents")
    .update({
      ocr_text: result.rawText ?? "",
      ai_json: result,
      vendor_name: result.vendorName,
      document_date: result.documentDate || null,
      total_amount: result.totalAmount || null,
      tax_amount: result.taxAmount || null,
      assignment_confidence: result.confidence,
      status: "needs_review",
    })
    .eq("id", documentId);
  if (error) console.warn("[ocr] documents更新に失敗:", error.message);
}

// ------------------------------------------------------------
// プロバイダ実装
// ------------------------------------------------------------

async function analyzeWithClaude(source: OcrSource, hint: DocumentType): Promise<OcrResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.OCR_MODEL || "claude-opus-4-8";
  const fileBlock: Anthropic.ContentBlockParam =
    source.kind === "pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: source.base64 },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: source.mediaType as ImageMedia,
            data: source.base64,
          },
        };

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          fileBlock,
          { type: "text", text: `この書類（ヒント: ${hint}）を読み取ってください。\n\n${JSON_SPEC}` },
        ],
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  return normalizeOcr(extractJson(text), hint);
}

async function analyzeWithOpenAI(source: OcrSource, hint: DocumentType): Promise<OcrResult> {
  if (source.kind === "pdf") throw new Error("OpenAI vision does not accept PDF");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: `この書類（ヒント: ${hint}）を読み取ってください。\n\n${JSON_SPEC}` },
            {
              type: "image_url",
              image_url: { url: `data:${source.mediaType};base64,${source.base64}` },
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? "";
  return normalizeOcr(extractJson(text), hint);
}

// ------------------------------------------------------------
// エンドポイント
// ------------------------------------------------------------

export async function POST(req: Request) {
  let hint: DocumentType = "receipt";
  let documentId: string | null = null;
  let filePath: string | null = null;
  let fallbackImage: string | null = null;
  let fallbackMime = "image/jpeg";

  try {
    const body = (await req.json()) as {
      documentId?: string | null;
      filePath?: string | null;
      image?: string | null;
      mimeType?: string;
      hint?: string;
    };
    if (DOC_TYPES.includes(body.hint as DocumentType)) hint = body.hint as DocumentType;
    documentId = typeof body.documentId === "string" && body.documentId ? body.documentId : null;
    filePath = typeof body.filePath === "string" && body.filePath ? body.filePath : null;
    fallbackImage = typeof body.image === "string" && body.image.length > 0 ? body.image : null;
    fallbackMime = body.mimeType || "image/jpeg";
  } catch {
    // ボディ不正でもモックで応答する
  }

  const sb = userScopedClient(req.headers.get("authorization"));

  // OCR入力の決定: Storageの原本を優先し、取得できなければクライアント縮小画像
  let source: OcrSource | null = null;
  if (filePath && sb) {
    try {
      source = await loadFromStorage(sb, filePath);
    } catch (err) {
      console.warn("[ocr] Storage取得に失敗（縮小画像へフォールバック）:", err);
    }
  }
  if (!source && fallbackImage) {
    source = { kind: "image", base64: fallbackImage, mediaType: toImageMedia(fallbackMime) };
  }

  if (source) {
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const result = await analyzeWithClaude(source, hint);
        if (sb && documentId) await persistToDocument(sb, documentId, result);
        return NextResponse.json({ provider: "claude", result });
      } catch (err) {
        console.error("[ocr] Claude解析に失敗:", err);
      }
    }
    if (process.env.OPENAI_API_KEY) {
      try {
        const result = await analyzeWithOpenAI(source, hint);
        if (sb && documentId) await persistToDocument(sb, documentId, result);
        return NextResponse.json({ provider: "openai", result });
      } catch (err) {
        console.error("[ocr] OpenAI解析に失敗:", err);
      }
    }
  }

  const hasKeys = Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
  return NextResponse.json({
    provider: "mock",
    result: mockOcrResult(hint),
    notice: hasKeys
      ? "AI読み取りに失敗しました。内容を手入力して登録できます。"
      : "AI OCRが未設定のため、サンプルの読み取り結果を表示しています。内容を確認・修正して保存してください。（.envにANTHROPIC_API_KEYを設定すると実際の読み取りが有効になります）",
  });
}
