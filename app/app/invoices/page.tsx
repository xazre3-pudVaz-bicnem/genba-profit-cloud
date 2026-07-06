"use client";

import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Money } from "@/components/app/money";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { FilterChips } from "@/components/ui/tabs";
import { invoiceIsOverdue } from "@/lib/calc";
import { INVOICE_STATUSES, OVERDUE_BADGE } from "@/lib/constants";
import { formatDate, yen } from "@/lib/format";
import { useDB } from "@/lib/store";
import type { Invoice, InvoiceStatus } from "@/lib/types";

type Filter = InvoiceStatus | "all" | "overdue";

function statusMeta(inv: Invoice) {
  return invoiceIsOverdue(inv)
    ? { label: "期限超過", badge: OVERDUE_BADGE, dot: "bg-red-500" }
    : INVOICE_STATUSES[inv.status];
}

export default function InvoicesPage() {
  const db = useDB();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    let list = [...db.invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter === "overdue") list = list.filter((i) => invoiceIsOverdue(i));
    else if (filter !== "all") list = list.filter((i) => i.status === filter);
    return list;
  }, [db.invoices, filter]);

  if (!db.hydrated) return <PageSkeleton />;

  const projectOf = (id: string | null) => db.projects.find((p) => p.id === id);
  const totalBilled = db.invoices.filter((i) => i.status === "sent").reduce((a, i) => a + i.total, 0);
  const totalOverdue = db.invoices.filter((i) => invoiceIsOverdue(i)).reduce((a, i) => a + i.total, 0);
  const totalPaid = db.invoices.filter((i) => i.status === "paid").reduce((a, i) => a + i.total, 0);

  return (
    <PageContainer>
      <PageHeader
        title="請求書"
        description="請求書の発行・入金状況を管理"
        actions={
          <Link href="/app/invoices/new">
            <Button>
              <Plus className="h-4 w-4" />
              請求書を作成
            </Button>
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label="入金待ち" value={yen(totalBilled)} size="sm" tone={totalBilled > 0 ? "warning" : "default"} />
        <StatCard label="期限超過" value={yen(totalOverdue)} size="sm" tone={totalOverdue > 0 ? "danger" : "default"} />
        <StatCard label="入金済" value={yen(totalPaid)} size="sm" tone="success" />
      </div>

      <FilterChips
        className="mb-4"
        items={[
          { value: "all", label: "すべて", count: db.invoices.length },
          { value: "draft", label: "下書き" },
          { value: "sent", label: "請求済" },
          { value: "overdue", label: "期限超過" },
          { value: "paid", label: "入金済" },
        ]}
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-card">
          <EmptyState
            icon={FileText}
            title="請求書がありません"
            description="請求書を作成すると、未入金・期限超過を自動で追跡します。"
            action={
              <Link href="/app/invoices/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  請求書を作成
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
                <TH>請求日</TH>
                <TH>支払期限</TH>
                <TH>ステータス</TH>
                <TH align="right">合計（税込）</TH>
              </THead>
              <TBody>
                {rows.map((inv) => (
                  <TR key={inv.id} onClick={() => router.push(`/app/invoices/${inv.id}`)}>
                    <TD className="tnum text-xs text-neutral-500">{inv.invoiceNumber}</TD>
                    <TD className="max-w-[280px]">
                      <p className="truncate text-[13px] font-semibold text-neutral-900">{inv.title}</p>
                      <p className="truncate text-[11px] text-neutral-400">{inv.customerName} 御中</p>
                    </TD>
                    <TD className="max-w-[180px] truncate text-xs text-neutral-500">
                      {projectOf(inv.projectId)?.name ?? "—"}
                    </TD>
                    <TD className="text-xs text-neutral-500">{formatDate(inv.invoiceDate)}</TD>
                    <TD className="text-xs text-neutral-500">{formatDate(inv.dueDate)}</TD>
                    <TD>
                      <StatusBadge meta={statusMeta(inv)} />
                    </TD>
                    <TD align="right">
                      <Money value={inv.total} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <div className="space-y-2.5 md:hidden">
            {rows.map((inv) => (
              <Link
                key={inv.id}
                href={`/app/invoices/${inv.id}`}
                className="block rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-card active:bg-neutral-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-neutral-900">{inv.title}</p>
                    <p className="text-[11px] text-neutral-400">
                      {inv.customerName} 御中・{inv.invoiceNumber}
                    </p>
                  </div>
                  <StatusBadge meta={statusMeta(inv)} />
                </div>
                <div className="mt-2.5 flex items-end justify-between">
                  <span className="text-[11px] text-neutral-400">期限 {formatDate(inv.dueDate)}</span>
                  <Money value={inv.total} className="text-base" />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
