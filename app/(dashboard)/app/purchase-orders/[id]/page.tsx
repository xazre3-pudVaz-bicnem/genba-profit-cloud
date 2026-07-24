"use client";

import {
  FileDown,
  FileSpreadsheet,
  FileX2,
  Pencil,
  Printer,
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
import {
  addCost,
  removePurchaseOrder,
  updatePurchaseOrder,
  useDB,
  useSession,
} from "@/lib/app/data-store";
import { exportDocumentExcel } from "@/lib/app/export-excel";
import { exportPrintAreaPdf } from "@/lib/app/export-pdf";
import { canEditData } from "@/lib/app/permissions";
import { todayISO, yen } from "@/lib/shared/format";

// ============================================================
// 発注書の詳細（A4帳票プレビュー・PDF/Excel出力・外注費への反映）
// ============================================================

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const db = useDB();
  const session = useSession();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const editable = canEditData(session?.role);

  if (!db.hydrated) return <PageSkeleton />;

  const po = db.purchaseOrders.find((p) => p.id === params.id);
  // この発注書から作成された外注費（メモの発注番号で紐づけ・二重反映防止）
  const linkedCost = po ? db.costs.find((c) => c.memo.includes(po.orderNumber)) : undefined;

  if (!po) {
    return (
      <PageContainer>
        <EmptyState
          icon={FileX2}
          title="発注書が見つかりません"
          action={
            <Link href="/app/documents/create">
              <Button variant="secondary">書類作成へ戻る</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="no-print">
        <AppPageHeader
          title={po.title}
          description={`${po.orderNumber}・${po.vendorName} 御中${po.status === "sent" ? "・発注済" : "・下書き"}`}
          backHref="/app/documents/create"
          backLabel="書類作成"
          actions={
            <>
              {editable && po.projectId && !linkedCost ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const projectId = po.projectId;
                    if (!projectId) return;
                    addCost({
                      projectId,
                      type: "order",
                      vendorName: po.vendorName,
                      title: po.title,
                      category: null,
                      amount: po.total,
                      taxType: "exclusive",
                      taxAmount: po.taxAmount,
                      paymentMethod: "invoice",
                      purchaseDate: po.orderDate ?? todayISO(),
                      paymentDueDate: po.deliveryDate,
                      paidDate: null,
                      status: "unpaid",
                      memo: `発注書 ${po.orderNumber} から自動登録`,
                      documentId: null,
                    });
                    if (po.status !== "sent") {
                      updatePurchaseOrder(po.id, { status: "sent" });
                    }
                    toast({
                      title: "外注費に反映しました",
                      description: `${yen(po.total)} を案件の外注費（未払い）に登録しました`,
                    });
                  }}
                >
                  <TrendingUp className="h-4 w-4" />
                  外注費に反映
                </Button>
              ) : null}
              {editable ? (
                <Link href={`/app/documents/create/purchase-order?id=${po.id}`}>
                  <Button variant="secondary">
                    <Pencil className="h-4 w-4" />
                    編集
                  </Button>
                </Link>
              ) : null}
              <Button
                variant="secondary"
                onClick={() =>
                  void exportDocumentExcel(
                    "purchase_order",
                    {
                      number: po.orderNumber,
                      customerName: po.vendorName,
                      title: po.title,
                      items: po.items,
                      subtotal: po.subtotal,
                      taxAmount: po.taxAmount,
                      total: po.total,
                      date: po.orderDate,
                      secondaryDateLabel: "納期",
                      secondaryDate: po.deliveryDate,
                      memo: po.memo,
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
                    `発注書_${po.title}_${po.orderDate ?? todayISO()}`
                  )
                }
              >
                <FileDown className="h-4 w-4" />
                PDFで出力
              </Button>
              <Button variant="ghost" size="icon" onClick={() => window.print()} aria-label="印刷" title="印刷">
                <Printer className="h-4 w-4" />
              </Button>
              {editable ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteOpen(true)}
                  className="text-neutral-400 hover:text-red-600"
                  aria-label="削除"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </>
          }
        />
        {linkedCost ? (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
            この発注書は外注費に反映済みです（{yen(linkedCost.amount)}）
          </p>
        ) : null}
      </div>

      <PrintDoc
        kind="purchase_order"
        company={db.company}
        data={{
          number: po.orderNumber,
          customerName: po.vendorName,
          title: po.title,
          items: po.items,
          subtotal: po.subtotal,
          taxAmount: po.taxAmount,
          total: po.total,
          date: po.orderDate,
          deliveryDate: po.deliveryDate,
          memo: po.memo,
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="発注書を削除しますか？"
        description={`${po.orderNumber} を削除します。この操作は取り消せません。`}
        onConfirm={() => {
          removePurchaseOrder(po.id);
          toast({ title: "発注書を削除しました" });
          router.push("/app/documents/create");
        }}
      />
    </PageContainer>
  );
}
