import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { mockOcrResult, normalizeOcr } from "@/lib/ocr-shared";
import type { DocumentType, OcrResult } from "@/lib/types";

// ============================================================
// AI OCR APIルート
// 優先順位: Claude Vision → OpenAI Vision → モック解析
// APIキーが未設定・エラーでも必ず200でモック結果を返し、
// アプリ全体が壊れないようにする
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

const EXTRACTION_PROMPT = `あなたは日本の建設業の経理アシスタントです。この画像はレシート・領収書・請求書・見積書・発注書・納品書のいずれかです。
画像から情報を読み取り、次のJSONだけを出力してください。説明文・マークダウン・コードブロックは禁止です。

{
  "documentType": "receipt | receipt_official | invoice | estimate | purchase_order | delivery_note | other のいずれか",
  "vendorName": "発行者名（店名・会社名）",
  "documentDate": "YYYY-MM-DD形式の日付",
  "totalAmount": 税込合計金額（数値・カンマなし）,
  "taxAmount": 消費税額（数値。不明なら0）,
  "items": [{"name": "品目名", "amount": 金額数値}] （主要な品目を最大5件）,
  "paymentMethod": "cash | credit | transfer | invoice | other のいずれか。不明ならnull",
  "addressee": "宛名（記載があれば。なければnull）",
  "registrationNumber": "インボイス登録番号（Tから始まる14桁。あれば）",
  "confidence": "high | medium | low（読み取りの自信度）",
  "rawText": "読み取れた主要なテキスト（3行以内）"
}

読み取れない項目はnullにしてください。金額は必ず数値型で出力してください。`;

type AllowedMedia = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function toMediaType(mime: string | undefined): AllowedMedia {
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

async function analyzeWithClaude(
  image: string,
  mimeType: string,
  hint: DocumentType
): Promise<OcrResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.OCR_MODEL || "claude-opus-4-8";
  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: toMediaType(mimeType), data: image },
          },
          { type: "text", text: EXTRACTION_PROMPT },
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

async function analyzeWithOpenAI(
  image: string,
  mimeType: string,
  hint: DocumentType
): Promise<OcrResult> {
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
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${image}` } },
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

export async function POST(req: Request) {
  let image: string | null = null;
  let mimeType = "image/jpeg";
  let hint: DocumentType = "receipt";

  try {
    const body = (await req.json()) as {
      image?: string | null;
      mimeType?: string;
      hint?: string;
    };
    image = typeof body.image === "string" && body.image.length > 0 ? body.image : null;
    mimeType = body.mimeType || "image/jpeg";
    if (DOC_TYPES.includes(body.hint as DocumentType)) hint = body.hint as DocumentType;
  } catch {
    // ボディ不正でもモックで応答する
  }

  if (image) {
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const result = await analyzeWithClaude(image, mimeType, hint);
        return NextResponse.json({ provider: "claude", result });
      } catch (err) {
        console.error("[ocr] Claude解析に失敗:", err);
      }
    }
    if (process.env.OPENAI_API_KEY) {
      try {
        const result = await analyzeWithOpenAI(image, mimeType, hint);
        return NextResponse.json({ provider: "openai", result });
      } catch (err) {
        console.error("[ocr] OpenAI解析に失敗:", err);
      }
    }
  }

  return NextResponse.json({
    provider: "mock",
    result: mockOcrResult(hint),
    notice:
      "AI OCRが未設定のため、サンプルの読み取り結果を表示しています。内容を確認・修正して保存してください。（.envにANTHROPIC_API_KEYを設定すると実際の読み取りが有効になります）",
  });
}
