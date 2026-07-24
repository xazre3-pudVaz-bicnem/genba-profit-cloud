"use client";

import {
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  FileX2,
  Pencil,
  Printer,
  ReceiptText,
  Trash2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { PrintDoc } from "@/components/app/print-doc";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSkeleton } from "@/components/shared/skeleton";
import { toast } from "@/components/shared/toast";
import { matchProjectByCustomer } from "@/lib/app/assign";
import { invoiceIsOverdue } from "@/lib/app/calc";
import { exportDocumentExcel } from "@/lib/app/export-excel";
import { exportPrintAreaPdf } from "@/lib/app/export-pdf";
import { todayISO, yen } from "@/lib/shared/format";
import {
  addRevenue,
  removeInvoice,
  updateInvoice,
  updateRevenue,
  useDB,
} from "@/lib/app/data-store";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const db = useDB();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  if (!db.hydrated) return <PageSkeleton />;

  const invoice = db.invoices.find((i) => i.id === params.id);
  // この請求書から作成された売上（メモの請求番号で紐づけ・二重反映防止）
  const linkedRevenue = invoice
    ? db.revenues.find((r) => r.memo.includes(invoice.invoiceNumber))
    : undefined;
  // 案件が未選択でも、宛名（顧客名）から案件を自動で推定する
  const matchedProject =
    invoice && !invoice.projectId ? matchProjectByCustomer(invoice.customerName, db) : null;
  const resolvedProjectId = invoice ? (invoice.projectId ?? matchedProject?.id ?? null) : null;
  const resolvedProject = resolvedProjectId
    ? db.projects.find((p) => p.id === resolvedProjectId)
    : undefined;

  /** 売上を作成し、宛名マッチだった場合は請求書にも案件を紐づける */
  const reflectRevenue = (opts: { paid: boolean }) => {
    if (!invoice || !resolvedProjectId) return false;
    const invoiceDate = invoice.invoiceDate ?? todayISO();
    addRevenue({
      projectId: resolvedProjectId,
      title: invoice.title,
      amount: invoice.total,
      taxType: "exclusive",
      taxAmount: invoice.taxAmount,
      billingDueDate: invoiceDate,
      billedDate: invoiceDate,
      paymentDueDate: invoice.dueDate,
      paidDate: opts.paid ? (invoice.paidDate ?? todayISO()) : null,
      status: opts.paid ? "paid" : "billed",
      memo: `請求書 ${invoice.invoiceNumber} から自動登録`,
      documentId: null,
    });
    if (!invoice.projectId) {
      updateInvoice(invoice.id, { projectId: resolvedProjectId });
    }
    return true;
  };

  if (!invoice) {
    return (
      <PageContainer>
        <EmptyState
          icon={FileX2}
          title="請求書が見つかりません"
          action={
            <Link href="/app/invoices">
              <Button variant="secondary">請求一覧へ戻る</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const overdue = invoiceIsOverdue(invoice);

  return (
    <PageContainer>
      <div className="no-print">
        <AppPageHeader
          title={invoice.title}
          description={`${invoice.invoiceNumber}・${invoice.customerName} 御中${overdue ? "・支払期限超過" : ""}`}
          backHref="/app/invoices"
          backLabel="請求一覧"
          actions={
            <>
              {invoice.status === "sent" ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    updateInvoice(invoice.id, { status: "paid", paidDate: todayISO() });
                    if (linkedRevenue) {
                      // 連動する売上も入金済にする
                      if (linkedRevenue.status !== "paid") {
                        updateRevenue(linkedRevenue.id, { status: "paid", paidDate: todayISO() });
                      }
                      toast({
                        title: "入金を記録しました",
                        description: "案件の売上にも反映しました",
                      });
                    } else if (reflectRevenue({ paid: true })) {
                      // 売上が未作成なら、宛名から案件を推定して入金済の売上を自動登録
                      toast({
                        title: "入金を記録しました",
                        description: `${resolvedProject?.name ?? "案件"}の売上に ${yen(invoice.total)} を反映しました`,
                      });
                    } else {
                      toast({
                        title: "入金を記録しました",
                        description: "宛名に一致する案件が見つからないため、売上への反映は行われませんでした",
                      });
                    }
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  入金を記録
                </Button>
              ) : null}
              {invoice.status !== "draft" && resolvedProjectId && !linkedRevenue ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!reflectRevenue({ paid: invoice.status === "paid" })) return;
                    toast({
                      title: "売上に反映しました",
                      description: `${yen(invoice.total)} を${resolvedProject?.name ?? "案件"}の売上に計上しました`,
                    });
                  }}
                >
                  <TrendingUp className="h-4 w-4" />
                  この請求書を売上に反映
                </Button>
              ) : null}
              {invoice.status === "draft" ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const invoiceDate = invoice.invoiceDate ?? todayISO();
                    updateInvoice(invoice.id, { status: "sent", invoiceDate });
                    // 案件に紐づく（または宛名から推定できた）請求は売上（請求済）としても計上する
                    if (!linkedRevenue && reflectRevenue({ paid: false })) {
                      toast({
                        title: "請求済にしました",
                        description: `${yen(invoice.total)} を${resolvedProject?.name ?? "案件"}の売上に反映しました`,
                      });
                    } else {
                      toast({ title: "請求済にしました" });
                    }
                  }}
                >
                  請求済にする
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => setShowReceipt((v) => !v)}
              >
                <ReceiptText className="h-4 w-4" />
                {showReceipt ? "請求書を表示" : "領収書を発行"}
              </Button>
              <Link href={`/app/invoices/new?id=${invoice.id}`}>
                <Button variant="secondary">
                  <Pencil className="h-4 w-4" />
                  編集
                </Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() =>
                  void exportDocumentExcel(
                    "invoice",
                    {
                      number: invoice.invoiceNumber,
                      customerName: invoice.customerName,
                      title: invoice.title,
                      items: invoice.items,
                      subtotal: invoice.subtotal,
                      taxAmount: invoice.taxAmount,
                      total: invoice.total,
                      date: invoice.invoiceDate,
                      secondaryDateLabel: "支払期限",
                      secondaryDate: invoice.dueDate,
                      memo: invoice.memo,
                    },
                    db.company
                  )
                }
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excelで出力
              </Button>
              <Button
                onClick={() =>
                  void exportPrintAreaPdf(
                    `請求書_${invoice.title}_${invoice.invoiceDate ?? todayISO()}`
                  )
                }
              >
                <FileDown className="h-4 w-4" />
                PDFで出力
              </Button>
              <Button variant="ghost" size="icon" onClick={() => window.print()} aria-label="印刷" title="印刷">
                <Printer className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteOpen(true)}
                className="text-neutral-400 hover:text-red-600"
                aria-label="削除"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          }
        />
        {overdue ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            支払期限を過ぎています。お客様へ入金確認のご連絡をおすすめします。
          </div>
        ) : null}
      </div>

      <PrintDoc
        kind={showReceipt ? "receipt" : "invoice"}
        company={db.company}
        data={{
          number: invoice.invoiceNumber,
          customerName: invoice.customerName,
          title: invoice.title,
          items: invoice.items,
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          date: showReceipt ? (invoice.paidDate ?? todayISO()) : invoice.invoiceDate,
          dueDate: invoice.dueDate,
          memo: showReceipt ? undefined : invoice.memo,
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="請求書を削除しますか？"
        description={`${invoice.invoiceNumber} を削除します。この操作は取り消せません。`}
        onConfirm={() => {
          removeInvoice(invoice.id);
          toast({ title: "請求書を削除しました" });
          router.push("/app/invoices");
        }}
      />
    </PageContainer>
  );
}
