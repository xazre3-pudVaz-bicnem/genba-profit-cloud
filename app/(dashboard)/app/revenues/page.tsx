"use client";

import { JapaneseYen, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CurrencyText } from "@/components/shared/currency-text";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { RevenueForm } from "@/components/app/revenue-form";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Select } from "@/components/shared/select";
import { PageSkeleton } from "@/components/shared/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/shared/table";
import { FilterChips } from "@/components/shared/tabs";
import { toast } from "@/components/shared/toast";
import { REVENUE_STATUSES } from "@/lib/app/constants";
import { formatDate, isOverdue, todayISO, yen } from "@/lib/shared/format";
import { removeRevenue, updateRevenue, useDB } from "@/lib/app/store";
import type { Revenue } from "@/lib/app/types";
import { cn } from "@/lib/shared/utils";

type Filter = "all" | "unbilled" | "billed" | "paid" | "unpaid";

function RevenuesContent() {
  const db = useDB();
  const params = useSearchParams();

  const [filter, setFilter] = useState<Filter>((params.get("filter") as Filter) || "all");
  const [projectId, setProjectId] = useState("all");
  const [form, setForm] = useState<{ open: boolean; editing: Revenue | null }>({ open: false, editing: null });
  const [deleteTarget, setDeleteTarget] = useState<Revenue | null>(null);

  const rows = useMemo(() => {
    let list = [...db.revenues].sort((a, b) =>
      (b.billedDate ?? b.billingDueDate ?? b.createdAt).localeCompare(
        a.billedDate ?? a.billingDueDate ?? a.createdAt
      )
    );
    switch (filter) {
      case "unbilled":
        list = list.filter((r) => r.status === "unbilled");
        break;
      case "billed":
        list = list.filter((r) => r.status === "billed");
        break;
      case "paid":
        list = list.filter((r) => r.status === "paid");
        break;
      case "unpaid":
        list = list.filter((r) => r.status === "billed" && !r.paidDate);
        break;
    }
    if (projectId !== "all") list = list.filter((r) => r.projectId === projectId);
    return list;
  }, [db.revenues, filter, projectId]);

  if (!db.hydrated) return <PageSkeleton />;

  const total = db.revenues.reduce((a, r) => a + r.amount, 0);
  const unbilled = db.revenues.filter((r) => r.status === "unbilled").reduce((a, r) => a + r.amount, 0);
  const unpaid = db.revenues
    .filter((r) => r.status === "billed" && !r.paidDate)
    .reduce((a, r) => a + r.amount, 0);
  const paid = db.revenues.filter((r) => r.status === "paid").reduce((a, r) => a + r.amount, 0);

  const projectOf = (id: string) => db.projects.find((p) => p.id === id);

  const markPaid = (r: Revenue) => {
    updateRevenue(r.id, { status: "paid", paidDate: todayISO() });
    toast({ title: "入金を記録しました", description: `${r.title} ${yen(r.amount)}` });
  };

  return (
    <PageContainer>
      <AppPageHeader
        title="売上"
        description="全案件の売上・請求・入金状況"
        actions={
          <Button onClick={() => setForm({ open: true, editing: null })}>
            <Plus className="h-4 w-4" />
            売上を登録
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="売上合計" value={yen(total)} size="sm" />
        <StatCard label="未請求" value={yen(unbilled)} size="sm" tone={unbilled > 0 ? "warning" : "default"} />
        <StatCard label="未入金" value={yen(unpaid)} size="sm" tone={unpaid > 0 ? "danger" : "default"} />
        <StatCard label="入金済" value={yen(paid)} size="sm" tone="success" />
      </div>

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips
          items={[
            { value: "all", label: "すべて", count: db.revenues.length },
            { value: "unbilled", label: "未請求" },
            { value: "billed", label: "請求済" },
            { value: "unpaid", label: "未入金" },
            { value: "paid", label: "入金済" },
          ]}
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
        />
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="sm:w-56">
          <option value="all">案件: すべて</option>
          {db.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-card">
          <EmptyState
            icon={JapaneseYen}
            title="売上がありません"
            description="案件の契約金額・着手金・完工金を登録して、利益を見える化しましょう。"
            action={
              <Button onClick={() => setForm({ open: true, editing: null })}>
                <Plus className="h-4 w-4" />
                売上を登録
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* PC: テーブル */}
          <div className="hidden rounded-2xl border border-neutral-200/80 bg-white shadow-card md:block">
            <Table>
              <THead>
                <TH>売上名 / 案件</TH>
                <TH>ステータス</TH>
                <TH>請求日</TH>
                <TH>入金予定 / 入金日</TH>
                <TH align="right">金額</TH>
                <TH align="center">操作</TH>
              </THead>
              <TBody>
                {rows.map((r) => {
                  const project = projectOf(r.projectId);
                  const overdue = r.status === "billed" && !r.paidDate && isOverdue(r.paymentDueDate);
                  return (
                    <TR key={r.id}>
                      <TD className="max-w-[280px]">
                        <p className="truncate text-[13px] font-semibold text-neutral-900">{r.title}</p>
                        <Link
                          href={`/app/projects/${r.projectId}?tab=revenue`}
                          className="truncate text-[11px] text-neutral-400 hover:text-brand-600"
                        >
                          {project?.name ?? "—"}
                        </Link>
                      </TD>
                      <TD>
                        <StatusBadge meta={REVENUE_STATUSES[r.status]} />
                      </TD>
                      <TD className="text-xs text-neutral-500">
                        {formatDate(r.billedDate ?? r.billingDueDate)}
                        {r.status === "unbilled" ? (
                          <span className="ml-1 text-[10px] text-amber-500">(予定)</span>
                        ) : null}
                      </TD>
                      <TD className={cn("text-xs", overdue ? "font-bold text-red-600" : "text-neutral-500")}>
                        {r.paidDate ? formatDate(r.paidDate) : formatDate(r.paymentDueDate)}
                        {overdue ? " 期限超過" : ""}
                      </TD>
                      <TD align="right">
                        <CurrencyText value={r.amount} />
                      </TD>
                      <TD align="center">
                        <div className="flex items-center justify-center gap-1">
                          {r.status === "billed" && !r.paidDate ? (
                            <Button size="sm" variant="secondary" onClick={() => markPaid(r)}>
                              入金を記録
                            </Button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setForm({ open: true, editing: r })}
                            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
                            aria-label="編集"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r)}
                            className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                            aria-label="削除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

          {/* スマホ: カード */}
          <div className="space-y-2.5 md:hidden">
            {rows.map((r) => {
              const project = projectOf(r.projectId);
              const overdue = r.status === "billed" && !r.paidDate && isOverdue(r.paymentDueDate);
              return (
                <div key={r.id} className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-neutral-900">{r.title}</p>
                      <p className="truncate text-[11px] text-neutral-400">{project?.name}</p>
                    </div>
                    <StatusBadge meta={REVENUE_STATUSES[r.status]} />
                  </div>
                  <div className="mt-2.5 flex items-end justify-between">
                    <p className={cn("text-[11px]", overdue ? "font-bold text-red-600" : "text-neutral-400")}>
                      {r.status === "paid"
                        ? `入金日 ${formatDate(r.paidDate)}`
                        : overdue
                          ? `入金期限超過（${formatDate(r.paymentDueDate)}）`
                          : r.status === "billed"
                            ? `入金予定 ${formatDate(r.paymentDueDate)}`
                            : `請求予定 ${formatDate(r.billingDueDate)}`}
                    </p>
                    <CurrencyText value={r.amount} className="text-base" />
                  </div>
                  <div className="mt-3 flex justify-end gap-2 border-t border-neutral-50 pt-2.5">
                    {r.status === "billed" && !r.paidDate ? (
                      <Button size="sm" variant="secondary" onClick={() => markPaid(r)}>
                        入金を記録
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => setForm({ open: true, editing: r })}>
                      <Pencil className="h-3.5 w-3.5" />
                      編集
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <RevenueForm
        open={form.open}
        onClose={() => setForm({ open: false, editing: null })}
        revenue={form.editing}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`「${deleteTarget?.title ?? ""}」を削除しますか？`}
        description="案件の収支から即時に差し引かれます。この操作は取り消せません。"
        onConfirm={() => {
          if (deleteTarget) {
            removeRevenue(deleteTarget.id);
            toast({ title: "売上を削除しました" });
          }
        }}
      />
    </PageContainer>
  );
}

export default function RevenuesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RevenuesContent />
    </Suspense>
  );
}
