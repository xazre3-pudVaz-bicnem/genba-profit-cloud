"use client";

import { toast } from "@/components/shared/toast";

// ============================================================
// A4帳票のPDF直接ダウンロード（印刷ダイアログを経由しない）
// .print-area を高解像度でキャプチャし、A4縦のPDFとして保存する。
// jspdf / html2canvas-pro はクリック時に動的importする。
// 失敗時はブラウザ印刷（PDF保存）へフォールバックする。
// ============================================================

function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
}

export async function exportPrintAreaPdf(fileNameBase: string): Promise<void> {
  const el = document.querySelector(".print-area") as HTMLElement | null;
  if (!el) {
    window.print();
    return;
  }
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    const img = canvas.toDataURL("image/jpeg", 0.95);

    // 1ページに収まらない場合は縦にスライスして複数ページへ
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(img, "JPEG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(img, "JPEG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${safeFileName(fileNameBase)}.pdf`);
  } catch (err) {
    console.error("[export-pdf] PDF生成に失敗:", err);
    toast({
      title: "PDFの生成に失敗しました",
      description: "印刷ダイアログからPDF保存をお試しください",
      variant: "error",
    });
    window.print();
  }
}
