"use client";

import { FileX2, Pencil, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { PrintDoc } from "@/components/app/print-doc";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Select } from "@/components/shared/select";
import { PageSkeleton } from "@/components/shared/skeleton";
import { toast } from "@/components/shared/toast";
import { ESTIMATE_STATUSES } from "@/lib/app/constants";
import { removeEstimate, updateEstimate, useDB } from "@/lib/app/data-store";
import type { EstimateStatus } from "@/lib/app/types";

export default function EstimateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const db = useDB();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!db.hydrated) return <PageSkeleton />;

  const estimate = db.estimates.find((e) => e.id === params.id);

  if (!estimate) {
    return (
      <PageContainer>
        <EmptyState
          icon={FileX2}
          title="見積書が見つかりません"
          action={
            <Link href="/app/estimates">
              <Button variant="secondary">見積一覧へ戻る</Button>
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
          title={estimate.title}
          description={`${estimate.estimateNumber}・${estimate.customerName} 御中`}
          backHref="/app/estimates"
          backLabel="見積一覧"
          actions={
            <>
              <Select
                value={estimate.status}
                onChange={(e) => {
                  updateEstimate(estimate.id, { status: e.target.value as EstimateStatus });
                  toast({
                    title: `ステータスを「${ESTIMATE_STATUSES[e.target.value as EstimateStatus].label}」に変更しました`,
                  });
                }}
                className="w-28"
              >
                {(Object.keys(ESTIMATE_STATUSES) as EstimateStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {ESTIMATE_STATUSES[s].label}
                  </option>
                ))}
              </Select>
              <Link href={`/app/estimates/new?id=${estimate.id}`}>
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
      </div>

      <PrintDoc
        kind="estimate"
        company={db.company}
        data={{
          number: estimate.estimateNumber,
          customerName: estimate.customerName,
          title: estimate.title,
          items: estimate.items,
          subtotal: estimate.subtotal,
          taxAmount: estimate.taxAmount,
          total: estimate.total,
          date: estimate.issueDate,
          validUntil: estimate.validUntil,
          memo: estimate.memo,
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="見積書を削除しますか？"
        description={`${estimate.estimateNumber} を削除します。この操作は取り消せません。`}
        onConfirm={() => {
          removeEstimate(estimate.id);
          toast({ title: "見積書を削除しました" });
          router.push("/app/estimates");
        }}
      />
    </PageContainer>
  );
}
