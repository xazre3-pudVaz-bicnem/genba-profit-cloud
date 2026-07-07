"use client";

import { FileSpreadsheet, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CurrencyText } from "@/components/shared/currency-text";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSkeleton } from "@/components/shared/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/shared/table";
import { FilterChips } from "@/components/shared/tabs";
import { ESTIMATE_STATUSES } from "@/lib/app/constants";
import { formatDate } from "@/lib/shared/format";
import { useDB } from "@/lib/app/store";
import type { EstimateStatus } from "@/lib/app/types";

export default function EstimatesPage() {
  const db = useDB();
  const router = useRouter();
  const [status, setStatus] = useState<EstimateStatus | "all">("all");

  const rows = useMemo(() => {
    let list = [...db.estimates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (status !== "all") list = list.filter((e) => e.status === status);
    return list;
  }, [db.estimates, status]);

  if (!db.hydrated) return <PageSkeleton />;

  const projectOf = (id: string | null) => db.projects.find((p) => p.id === id);

  return (
    <PageContainer>
      <AppPageHeader
        title="見積書"
        description="見積書の作成・提出状況を管理"
        actions={
          <Link href="/app/estimates/new">
            <Button>
              <Plus className="h-4 w-4" />
              見積を作成
            </Button>
          </Link>
        }
      />

      <FilterChips
        className="mb-4"
        items={[
          { value: "all", label: "すべて", count: db.estimates.length },
          ...(Object.keys(ESTIMATE_STATUSES) as EstimateStatus[]).map((s) => ({
            value: s,
            label: ESTIMATE_STATUSES[s].label,
            count: db.estimates.filter((e) => e.status === s).length,
          })),
        ]}
        value={status}
        onChange={(v) => setStatus(v as EstimateStatus | "all")}
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-card">
          <EmptyState
            icon={FileSpreadsheet}
            title="見積書がありません"
            description="明細を入力するだけで、A4のきれいな見積書PDFを発行できます。"
            action={
              <Link href="/app/estimates/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  見積を作成
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="hidden rounded-2xl border border-neutral-200/80 bg-white shadow-card md:block">
            <Table>
              <THead>
                <TH>番号</TH>
                <TH>件名 / 宛名</TH>
                <TH>案件</TH>
                <TH>発行日</TH>
                <TH>有効期限</TH>
                <TH>ステータス</TH>
                <TH align="right">合計（税込）</TH>
              </THead>
              <TBody>
                {rows.map((e) => (
                  <TR key={e.id} onClick={() => router.push(`/app/estimates/${e.id}`)}>
                    <TD className="tnum text-xs text-neutral-500">{e.estimateNumber}</TD>
                    <TD className="max-w-[280px]">
                      <p className="truncate text-[13px] font-semibold text-neutral-900">{e.title}</p>
                      <p className="truncate text-[11px] text-neutral-400">{e.customerName} 御中</p>
                    </TD>
                    <TD className="max-w-[180px] truncate text-xs text-neutral-500">
                      {projectOf(e.projectId)?.name ?? "—"}
                    </TD>
                    <TD className="text-xs text-neutral-500">{formatDate(e.issueDate)}</TD>
                    <TD className="text-xs text-neutral-500">{formatDate(e.validUntil)}</TD>
                    <TD>
                      <StatusBadge meta={ESTIMATE_STATUSES[e.status]} />
                    </TD>
                    <TD align="right">
                      <CurrencyText value={e.total} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <div className="space-y-2.5 md:hidden">
            {rows.map((e) => (
              <Link
                key={e.id}
                href={`/app/estimates/${e.id}`}
                className="block rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-card active:bg-neutral-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-neutral-900">{e.title}</p>
                    <p className="text-[11px] text-neutral-400">
                      {e.customerName} 御中・{e.estimateNumber}
                    </p>
                  </div>
                  <StatusBadge meta={ESTIMATE_STATUSES[e.status]} />
                </div>
                <div className="mt-2.5 flex items-end justify-between">
                  <span className="text-[11px] text-neutral-400">発行 {formatDate(e.issueDate)}</span>
                  <CurrencyText value={e.total} className="text-base" />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
