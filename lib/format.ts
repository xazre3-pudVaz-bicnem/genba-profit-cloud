import { TAX_RATE } from "./constants";
import type { TaxType } from "./types";

// ============================================================
// 金額・日付・消費税の共通関数（すべての画面でこれを使う）
// ============================================================

/** 日本円表示 "¥1,234,567"（負値は "-¥1,234"） */
export function yen(n: number): string {
  const rounded = Math.round(n);
  const abs = Math.abs(rounded).toLocaleString("ja-JP");
  return `${rounded < 0 ? "-" : ""}¥${abs}`;
}

/** 利益率など小数1桁のパーセント表示 "34.5%" */
export function pct1(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

/** "2026/07/06" 形式。null/undefinedは "—" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** "7/6" 形式の短い日付 */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** "2026年7月6日" 形式 */
export function longDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 相対表示（"今日" / "3日前" / "5日後" / それ以外は短い日付） */
export function relativeDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const days = daysUntil(iso);
  if (days === null) return "—";
  if (days === 0) return "今日";
  if (days === 1) return "明日";
  if (days === -1) return "昨日";
  if (days < 0 && days >= -7) return `${-days}日前`;
  if (days > 0 && days <= 7) return `${days}日後`;
  return formatDate(iso);
}

/** 今日からの日数差（未来は正、過去は負） */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** 期日超過か（date < 今日） */
export function isOverdue(iso: string | null | undefined): boolean {
  const d = daysUntil(iso);
  return d !== null && d < 0;
}

/** "YYYY-MM" 月キー */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** "2026年7月" */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${y}年${Number(m)}月`;
}

/** "7月" */
export function monthShortLabel(key: string): string {
  const [, m] = key.split("-");
  return `${Number(m)}月`;
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** 今日の "YYYY-MM-DD" */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

/** 今日からoffset日ずらした "YYYY-MM-DD"（デモデータ・初期値用） */
export function dateFromToday(offsetDays: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

// ------------------------------------------------------------
// 消費税計算（共通関数）
// 集計の基準はすべて「税込合計 amount」に統一する
// ------------------------------------------------------------

export interface TaxCalc {
  /** 税込合計 */
  total: number;
  /** うち消費税 */
  tax: number;
}

/**
 * 入力金額と税区分から税込合計・消費税額を計算する
 * - inclusive: 入力は税込 → 税額を内数で計算
 * - exclusive: 入力は税別 → 税額を加算
 * - none: 非課税
 */
export function calcTax(inputAmount: number, taxType: TaxType): TaxCalc {
  const amount = Math.round(inputAmount) || 0;
  switch (taxType) {
    case "inclusive":
      return { total: amount, tax: Math.round((amount * TAX_RATE) / (1 + TAX_RATE)) };
    case "exclusive": {
      const tax = Math.round(amount * TAX_RATE);
      return { total: amount + tax, tax };
    }
    case "none":
      return { total: amount, tax: 0 };
  }
}

/** 明細行（税別単価）の合計から消費税を計算（帳票用） */
export function taxFromSubtotal(subtotal: number): number {
  return Math.round(subtotal * TAX_RATE);
}

/** 数値文字列をパース（カンマ・全角数字対応） */
export function parseAmount(value: string): number {
  const normalized = value
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，¥￥\s円]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** 数字にカンマを付ける（入力欄表示用） */
export function withCommas(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "";
  return Math.round(n).toLocaleString("ja-JP");
}
