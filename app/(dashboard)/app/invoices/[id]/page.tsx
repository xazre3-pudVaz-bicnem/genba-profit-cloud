"use client";

import { CheckCircle2, FileX2, Pencil, Printer, ReceiptText, Trash2 } from "lucide-react";
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
import { invoiceIsOverdue } from "@/lib/app/calc";
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
  // この請求書から作成された売上（メモの請求番号で紐づけ）
  const linkedRevenue = invoice
    ? db.revenues.find((r) => r.memo.includes(invoice.invoiceNumber))
    : undefined;

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
                    // 連動する売上も入金済にする
                    if (linkedRevenue && linkedRevenue.status !== "paid") {
                      updateRevenue(linkedRevenue.id, { status: "paid", paidDate: todayISO() });
                    }
                    toast({
                      title: "入金を記録しました",
                      description: linkedRevenue ? "案件の売上にも反映しました" : undefined,
                    });
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  入金を記録
                </Button>
              ) : null}
              {invoice.status === "draft" ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const invoiceDate = invoice.invoiceDate ?? todayISO();
                    updateInvoice(invoice.id, { status: "sent", invoiceDate });
                    // 案件に紐づく請求は売上（請求済）としても計上する
                    if (invoice.projectId && !linkedRevenue) {
                      addRevenue({
                        projectId: invoice.projectId,
                        title: invoice.title,
                        amount: invoice.total,
                        taxType: "exclusive",
                        taxAmount: invoice.taxAmount,
                        billingDueDate: invoiceDate,
                        billedDate: invoiceDate,
                        paymentDueDate: invoice.dueDate,
                        paidDate: null,
                        status: "billed",
                        memo: `請求書 ${invoice.invoiceNumber} から自動登録`,
                        documentId: null,
                      });
                      toast({
                        title: "請求済にしました",
                        description: `${yen(invoice.total)} を案件の売上に反映しました`,
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
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                印刷 / PDF保存
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
