"use client";

import type { Company, LineItem } from "./types";

// ============================================================
// 見積書・請求書・発注書のExcel出力（xlsxを動的import）
// ファイル名例: 見積書_〇〇様邸改修_2026-07-14.xlsx
// ============================================================

export type ExcelDocKind = "estimate" | "invoice" | "purchase_order";

const KIND_LABELS: Record<ExcelDocKind, string> = {
  estimate: "見積書",
  invoice: "請求書",
  purchase_order: "発注書",
};

export interface ExcelDocData {
  number: string;
  /** 宛名（発注書は発注先） */
  customerName: string;
  title: string;
  items: LineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  date: string | null;
  /** 見積: 有効期限 / 請求: 支払期限 / 発注: 納期 */
  secondaryDateLabel?: string;
  secondaryDate?: string | null;
  memo?: string;
}

function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
}

export async function exportDocumentExcel(
  kind: ExcelDocKind,
  data: ExcelDocData,
  company: Company
): Promise<void> {
  const XLSX = await import("xlsx");
  const label = KIND_LABELS[kind];
  const addresseeLabel = kind === "purchase_order" ? "発注先" : "宛名";
  const dateLabel = kind === "estimate" ? "見積日" : kind === "invoice" ? "請求日" : "発注日";

  const aoa: (string | number)[][] = [
    [label],
    [],
    ["No.", data.number],
    [addresseeLabel, data.customerName ? `${data.customerName} 御中` : ""],
    ["件名", data.title],
    [dateLabel, data.date ?? ""],
  ];
  if (data.secondaryDateLabel) {
    aoa.push([data.secondaryDateLabel, data.secondaryDate ?? ""]);
  }
  aoa.push([]);
  aoa.push(["No.", "内容", "数量", "単位", "単価", "金額"]);
  data.items.forEach((item, i) => {
    aoa.push([i + 1, item.name, item.quantity, item.unit, item.unitPrice, item.amount]);
  });
  aoa.push([]);
  aoa.push(["", "", "", "", "小計（税別）", data.subtotal]);
  aoa.push(["", "", "", "", "消費税", data.taxAmount]);
  aoa.push(["", "", "", "", "合計（税込）", data.total]);
  if (data.memo) {
    aoa.push([]);
    aoa.push(["備考", data.memo]);
  }

  // 自社情報
  aoa.push([]);
  aoa.push(["発行元", company.name || ""]);
  if (company.postalCode || company.address) {
    aoa.push(["住所", `${company.postalCode ? `〒${company.postalCode} ` : ""}${company.address}`]);
  }
  if (company.phone) aoa.push(["電話番号", company.phone]);
  if (company.email) aoa.push(["メール", company.email]);
  if (company.invoiceRegistrationNumber) {
    aoa.push(["インボイス登録番号", company.invoiceRegistrationNumber]);
  }
  if (kind === "invoice" && company.bankName) {
    aoa.push([
      "お振込先",
      `${company.bankName} ${company.bankBranch}（${company.bankAccountType}）${company.bankAccountNumber} ${company.bankAccountHolder}`,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 6 }, { wch: 32 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, label);

  const dateStr = data.date ?? new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${label}_${safeFileName(data.title || data.customerName || data.number)}_${dateStr}.xlsx`);
}
