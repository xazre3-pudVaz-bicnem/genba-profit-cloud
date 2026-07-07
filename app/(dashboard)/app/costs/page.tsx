"use client";

import { Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { CostForm } from "@/components/app/cost-form";
import { CurrencyText } from "@/components/shared/currency-text";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Select } from "@/components/shared/select";
import { PageSkeleton } from "@/components/shared/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/shared/table";
import { FilterChips } from "@/components/shared/tabs";
import { toast } from "@/components/shared/toast";
import { COST_STATUSES, COST_TYPES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/app/constants";
import { formatDate, yen } from "@/lib/shared/format";
import { removeCost, useDB } from "@/lib/app/data-store";
import type { Cost, CostStatus, CostType } from "@/lib/app/types";
import { cn } from "@/lib/shared/utils";

function CostsContent() {
  const db = useDB();

  const [type, setType] = useState<CostType | "all">("all");
  const [status, setStatus] = useState<CostStatus | "all">("all");
  const [projectId, setProjectId] = useState("all");
  const [form, setForm] = useState<{ open: boolean; editing: Cost | null }>({ open: false, editing: null });
  const [deleteTarget, setDeleteTarget] = useState<Cost | null>(null);

  const rows = useMemo(() => {
    let list = [...db.costs].sort((a, b) =>
      (b.purchaseDate ?? b.createdAt).localeCompare(a.purchaseDate ?? a.createdAt)
    );
    if (type !== "all") list = list.filter((c) => c.type === type);
    if (status !== "all") list = list.filter((c) => c.status === status);
    if (projectId !== "all") list = list.filter((c) => c.projectId === projectId);
    return list;
  }, [db.costs, type, status, projectId]);

  if (!db.hydrated) return <PageSkeleton />;

  const sum = (t: CostType) => db.costs.filter((c) => c.type === t).reduce((a, c) => a + c.amount, 0);
  const totalAll = db.costs.reduce((a, c) => a + c.amount, 0);
  const unpaidTotal = db.costs.filter((c) => c.status === "unpaid").reduce((a, c) => a + c.amount, 0);

  const projectOf = (id: string) => db.projects.find((p) => p.id === id);

  return (
    <PageContainer>
      <AppPageHeader
        title="原価"
        description="発注費・材料費・経費の一覧"
        actions={
          <Button onClick={() => setForm({ open: true, editing: null })}>
            <Plus className="h-4 w-4" />
            原価を登録
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="原価合計" value={yen(totalAll)} size="sm" />
        <StatCard label="発注費" value={yen(sum("order"))} size="sm" />
        <StatCard label="材料費" value={yen(sum("material"))} size="sm" />
        <StatCard label="その他経費" value={yen(sum("expense"))} size="sm" />
        <StatCard
          label="未払い"
          value={yen(unpaidTotal)}
          size="sm"
          tone={unpaidTotal > 0 ? "warning" : "default"}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips
          items={[
            { value: "all", label: "すべて", count: db.costs.length },
            { value: "order", label: "発注費" },
            { value: "material", label: "材料費" },
            { value: "expense", label: "経費" },
          ]}
          value={type}
          onChange={(v) => setType(v as CostType | "all")}
        />
        <div className="flex gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value as CostStatus | "all")} className="w-32">
            <option value="all">支払: すべて</option>
            <option value="unpaid">未払い</option>
            <option value="paid">支払済</option>
          </Select>
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full sm:w-56">
            <option value="all">案件: すべて</option>
            {db.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-card">
          <EmptyState
            icon={Receipt}
            title="原価がありません"
            description="レシートを写真で撮るか、手入力で材料費・外注費を登録しましょう。"
            action={
              <div className="flex gap-2">
                <Link href="/app/documents/upload">
                  <Button variant="secondary">レシートを撮る</Button>
                </Link>
                <Button onClick={() => setForm({ open: true, editing: null })}>
                  <Plus className="h-4 w-4" />
                  手入力で登録
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <>
          {/* PC: テーブル */}
          <div className="hidden rounded-2xl border border-neutral-200/80 bg-white shadow-card md:block">
            <Table>
              <THead>
                <TH>取引先 / 内容</TH>
                <TH>種別</TH>
                <TH>案件</TH>
                <TH>日付</TH>
                <TH>支払方法</TH>
                <TH>支払</TH>
                <TH align="right">金額</TH>
                <TH align="center">操作</TH>
              </THead>
              <TBody>
                {rows.map((c) => {
                  const project = projectOf(c.projectId);
                  return (
                    <TR key={c.id}>
                      <TD className="max-w-[240px]">
                        <p className="truncate text-[13px] font-semibold text-neutral-900">
                          {c.vendorName || c.title}
                        </p>
                        <p className="truncate text-[11px] text-neutral-400">
                          {[c.vendorName ? c.title : null, c.category ? EXPENSE_CATEGORIES[c.category] : null]
                            .filter(Boolean)
                            .join("・")}
                        </p>
                      </TD>
                      <TD>
                        <Badge className={COST_TYPES[c.type].badge}>{COST_TYPES[c.type].shortLabel}</Badge>
                      </TD>
                      <TD className="max-w-[180px]">
                        <Link
                          href={`/app/projects/${c.projectId}?tab=${c.type}`}
                          className="block truncate text-xs text-neutral-500 hover:text-brand-600"
                        >
                          {project?.name ?? "—"}
                        </Link>
                      </TD>
                      <TD className="text-xs text-neutral-500">{formatDate(c.purchaseDate)}</TD>
                      <TD className="text-xs text-neutral-500">
                        {c.paymentMethod ? PAYMENT_METHODS[c.paymentMethod] : "—"}
                      </TD>
                      <TD>
                        <StatusBadge meta={COST_STATUSES[c.status]} />
                      </TD>
                      <TD align="right">
                        <CurrencyText value={c.amount} />
                      </TD>
                      <TD align="center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setForm({ open: true, editing: c })}
                            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
                            aria-label="編集"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(c)}
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
            {rows.map((c) => {
              const project = projectOf(c.projectId);
              return (
                <div key={c.id} className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-neutral-900">
                        {c.vendorName || c.title}
                      </p>
                      <p className="truncate text-[11px] text-neutral-400">{project?.name}</p>
                    </div>
                    <Badge className={COST_TYPES[c.type].badge}>{COST_TYPES[c.type].shortLabel}</Badge>
                  </div>
                  <div className="mt-2.5 flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge meta={COST_STATUSES[c.status]} />
                      <span className="text-[11px] text-neutral-400">{formatDate(c.purchaseDate)}</span>
                    </div>
                    <CurrencyText value={c.amount} className="text-base" />
                  </div>
                  <div className="mt-3 flex justify-end gap-2 border-t border-neutral-50 pt-2.5">
                    <Button size="sm" variant="ghost" onClick={() => setForm({ open: true, editing: c })}>
                      <Pencil className="h-3.5 w-3.5" />
                      編集
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn("text-red-500 hover:bg-red-50")}
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      削除
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <CostForm open={form.open} onClose={() => setForm({ open: false, editing: null })} cost={form.editing} />
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`「${deleteTarget?.vendorName || deleteTarget?.title || ""}」を削除しますか？`}
        description="案件の収支から即時に差し引かれます。この操作は取り消せません。"
        onConfirm={() => {
          if (deleteTarget) {
            removeCost(deleteTarget.id);
            toast({ title: "原価を削除しました" });
          }
        }}
      />
    </PageContainer>
  );
}

export default function CostsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CostsContent />
    </Suspense>
  );
}
