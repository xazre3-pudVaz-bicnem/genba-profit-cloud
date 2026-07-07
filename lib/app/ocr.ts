"use client";

import { mockOcrResult, normalizeOcr } from "./ocr-shared";
import type { DocumentType, OcrResult } from "./types";

// ============================================================
// クライアント側のOCRヘルパー
// 画像を縮小してAPIへ送信。API未設定・接続失敗時はモックへ
// フォールバックし、アプリが止まらないようにする
// ============================================================

export type OcrProvider = "claude" | "openai" | "mock";

export interface AnalyzeOutcome {
  result: OcrResult;
  provider: OcrProvider;
  notice?: string;
}

interface ResizedImage {
  base64: string;
  mimeType: string;
  dataUrl: string;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした"));
    };
    img.src = url;
  });
}

function drawToDataUrl(img: HTMLImageElement, maxDim: number, quality: number): string {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

/** 送信用に画像を縮小（最大1568px・JPEG） */
export async function resizeForUpload(file: File): Promise<ResizedImage> {
  const img = await loadImage(file);
  const dataUrl = drawToDataUrl(img, 1568, 0.85);
  return {
    dataUrl,
    base64: dataUrl.split(",")[1] ?? "",
    mimeType: "image/jpeg",
  };
}

/** 一覧表示用のサムネイル（小さめJPEG dataURL）。失敗時はnull */
export async function makeThumbnail(file: File): Promise<string | null> {
  try {
    const img = await loadImage(file);
    return drawToDataUrl(img, 360, 0.6);
  } catch {
    return null;
  }
}

export interface AnalyzeOptions {
  /** Storage上の原本パス。指定するとサーバーが原本を取得して解析する */
  filePath?: string | null;
  /** documents.id。指定するとサーバーが解析結果をdocumentsへ保存する */
  documentId?: string | null;
  /** SupabaseのアクセストークンJWT（Storage取得・documents更新のRLS用） */
  accessToken?: string | null;
}

/**
 * 書類をAI解析する（本番モード用）。
 * 1. Storageパス + JWT を /api/ocr へ送信（サーバーが原本を取得してClaude/OpenAIで解析）
 * 2. あわせて縮小画像も送り、Storage取得に失敗した場合のフォールバックにする
 * 3. 通信やAPI自体が失敗した場合はモック結果 + 失敗通知を返す
 *    （呼び出し側は provider === "mock" を「実読み取り失敗」として扱える）
 */
export async function analyzeDocument(
  file: File,
  hint: DocumentType,
  opts: AnalyzeOptions = {}
): Promise<AnalyzeOutcome> {
  let image: ResizedImage | null = null;
  try {
    image = await resizeForUpload(file);
  } catch {
    image = null; // PDF等は縮小不可。Storage原本側で解析する
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;
    const res = await fetch("/api/ocr", {
      method: "POST",
      headers,
      body: JSON.stringify({
        documentId: opts.documentId ?? null,
        filePath: opts.filePath ?? null,
        image: image?.base64 ?? null,
        mimeType: image?.mimeType ?? file.type,
        hint,
      }),
    });
    if (!res.ok) throw new Error(`OCR API error: ${res.status}`);
    const data = (await res.json()) as {
      provider?: OcrProvider;
      result?: unknown;
      notice?: string;
    };
    return {
      provider: data.provider ?? "mock",
      result: normalizeOcr(data.result, hint),
      notice: data.notice,
    };
  } catch {
    return {
      provider: "mock",
      result: mockOcrResult(hint),
      notice: "AI読み取りに失敗しました。内容を手入力して登録できます。",
    };
  }
}

/** デモモード用のモック解析（実OCR APIは呼ばない） */
export function analyzeMock(hint: DocumentType): AnalyzeOutcome {
  return { provider: "mock", result: mockOcrResult(hint) };
}
