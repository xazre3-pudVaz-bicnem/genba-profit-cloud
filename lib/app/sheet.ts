"use client";

import { parseAmount } from "../shared/format";

// ============================================================
// Excel / CSV の読み込み（クライアント側・xlsxを動的import）
// 表データを行列で読み取り、列の役割（日付・取引先・品目・金額等）を
// ヘッダー名から推定する。ユーザーは確認画面で列の割り当てを変更できる。
// ============================================================

export type SheetColumnKey =
  | "date"
  | "vendor"
  | "item"
  | "amount"
  | "tax"
  | "payment"
  | "memo"
  | "none";

export const SHEET_COLUMN_LABELS: Record<SheetColumnKey, string> = {
  date: "日付",
  vendor: "取引先",
  item: "品目",
  amount: "金額",
  tax: "税額",
  payment: "支払方法",
  memo: "メモ",
  none: "使わない",
};

export interface ParsedSheet {
  fileName: string;
  /** ヘッダー行（1行目） */
  headers: string[];
  /** データ行（ヘッダー除く、文字列化済み） */
  rows: string[][];
  /** 列ごとの推定役割（headersと同じ長さ） */
  guessedColumns: SheetColumnKey[];
}

/** ヘッダー名から列の役割を推定する */
function guessColumn(header: string): SheetColumnKey {
  const h = header.trim().toLowerCase();
  if (!h) return "none";
  if (/日付|年月日|購入日|取引日|date/.test(h)) return "date";
  if (/取引先|仕入先|支払先|店|会社|業者|vendor|supplier/.test(h)) return "vendor";
  if (/品目|品名|内容|摘要|項目|商品|item|description/.test(h)) return "item";
  if (/税抜|税別/.test(h)) return "none";
  if (/税額|消費税|tax/.test(h)) return "tax";
  if (/金額|合計|税込|価格|amount|total|price/.test(h)) return "amount";
  if (/支払|決済|payment/.test(h)) return "payment";
  if (/メモ|備考|note|memo/.test(h)) return "memo";
  return "none";
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(
      v.getDate()
    ).padStart(2, "0")}`;
  }
  return String(v).trim();
}

/** CSVをテキストとして読む（UTF-8 → 文字化け検出時は Shift_JIS を試す） */
async function readCsvText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  if (!utf8.includes("�")) return utf8;
  try {
    return new TextDecoder("shift_jis").decode(buf);
  } catch {
    return utf8;
  }
}

/**
 * Excel / CSV ファイルを解析する。
 * 失敗時は日本語メッセージのErrorを投げる（呼び出し側でトースト表示）。
 */
export async function parseSheetFile(file: File): Promise<ParsedSheet> {
  const XLSX = await import("xlsx");
  const isCsv = file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
  // CSVは文字コードを自前で判定してから渡す（日本語ヘッダーの文字化け対策）
  const wb = isCsv
    ? XLSX.read(await readCsvText(file), { type: "string", cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("シートが見つかりませんでした");
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });

  // 空行を除去
  const nonEmpty = aoa
    .map((row) => (row ?? []).map(cellToString))
    .filter((row) => row.some((c) => c !== ""));
  if (nonEmpty.length === 0) throw new Error("データが入っていないファイルです");

  const [headerRow, ...rows] = nonEmpty;
  const colCount = Math.max(headerRow.length, ...rows.map((r) => r.length), 1);
  const headers = Array.from({ length: colCount }, (_, i) => headerRow[i] ?? `列${i + 1}`);
  const guessedColumns = headers.map(guessColumn);

  // 金額列が推定できなかった場合は「数値が多い列」を金額とみなす
  if (!guessedColumns.includes("amount") && rows.length > 0) {
    let best = -1;
    let bestCount = 0;
    for (let i = 0; i < colCount; i++) {
      if (guessedColumns[i] !== "none") continue;
      const count = rows.filter((r) => parseAmount(r[i] ?? "") > 0).length;
      if (count > bestCount) {
        best = i;
        bestCount = count;
      }
    }
    if (best >= 0) guessedColumns[best] = "amount";
  }

  return {
    fileName: file.name,
    headers,
    rows: rows.map((r) => Array.from({ length: colCount }, (_, i) => r[i] ?? "")),
    guessedColumns,
  };
}

/** 日付文字列をYYYY-MM-DDへ正規化（できなければnull） */
export function normalizeSheetDate(value: string): string | null {
  const s = value.trim();
  if (!s) return null;
  const m = s.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return null;
}

/** 割り当て済み列で1行を解釈する */
export interface SheetRowValues {
  date: string | null;
  vendor: string;
  item: string;
  amount: number;
  tax: number;
  memo: string;
}

export function extractRow(row: string[], columns: SheetColumnKey[]): SheetRowValues {
  const pick = (key: SheetColumnKey) => {
    const i = columns.indexOf(key);
    return i >= 0 ? (row[i] ?? "") : "";
  };
  return {
    date: normalizeSheetDate(pick("date")),
    vendor: pick("vendor"),
    item: pick("item"),
    amount: parseAmount(pick("amount")),
    tax: parseAmount(pick("tax")),
    memo: pick("memo"),
  };
}
