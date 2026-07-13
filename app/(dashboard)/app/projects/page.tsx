"use client";

import { ChevronLeft, ChevronRight, FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSkeleton } from "@/components/shared/skeleton";
import {
  costAccrualDate,
  monthSummary,
  projectFinance,
  projectsForMonth,
  revenueAccrualDate,
} from "@/lib/app/calc";
import { PROJECT_STATUSES } from "@/lib/app/constants";
import { useDB } from "@/lib/app/data-store";
import {
  currentMonthKey,
  localDateOf,
  monthKey,
  monthLabel,
  pct1,
  shiftMonthKey,
  yen,
} from "@/lib/shared/format";
import { cn } from "@/lib/shared/utils";

// ============================================================
// 案件一覧（月ごとのシンプル管理画面）
// タブ・フィルターは置かず、「今月の数字」と「案件カード」だけを見せる。
// 集計ルールは lib/app/calc.ts の monthSummary / projectsForMonth に共通化。
// ============================================================

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "success";
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-card sm:p-5">
      <p className="text-xs font-medium text-neutral-400">{label}</p>
      <p
        className={cn(
          "tnum mt-1.5 text-xl font-bold tracking-tight sm:text-2xl",
          tone === "danger" ? "text-red-600" : tone === "success" ? "text-emerald-600" : "text-neutral-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function ProjectsPage() {
  const db = useDB();
  const [month, setMonth] = useState(currentMonthKey());

  if (!db.hydrated) return <PageSkeleton />;

  const summary = monthSummary(db, month);
  const projects = projectsForMonth(db, month).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
  const isCurrentMonth = month === currentMonthKey();
  const year = Number(month.slice(0, 4));

  // データ（収支・案件）のある月に印を付ける
  const monthsWithData = new Set<string>();
  for (const r of db.revenues) monthsWithData.add(monthKey(revenueAccrualDate(r)));
  for (const c of db.costs) monthsWithData.add(monthKey(costAccrualDate(c)));
  for (const p of db.projects) monthsWithData.add(monthKey(localDateOf(p.createdAt)));

  return (
    <PageContainer>
      <AppPageHeader
        title="案件一覧"
        description="月ごとの売上・原価・利益を確認できます"
        actions={
          <Link href="/app/projects/new">
            <Button>
              <Plus className="h-4 w-4" />
              案件を追加
            </Button>
          </Link>
        }
      />

      {/* 年月切り替え（1年分の月をまとめて表示） */}
      <div className="mb-4 rounded-2xl border border-neutral-200/80 bg-white p-3.5 shadow-card sm:p-4">
        <div className="mb-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setMonth(shiftMonthKey(month, -12))}
            className="flex h-9 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
            aria-label="前の年"
          >
            <ChevronLeft className="h-4 w-4" />
            前年
          </button>
          <p className="w-24 text-center text-lg font-bold tracking-tight text-neutral-900">
            {year}年
          </p>
          <button
            type="button"
            onClick={() => setMonth(shiftMonthKey(month, 12))}
            className="flex h-9 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
            aria-label="次の年"
          >
            翌年
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isCurrentMonth ? (
            <button
              type="button"
              onClick={() => setMonth(currentMonthKey())}
              className="ml-1 text-xs font-medium text-brand-600 hover:underline cursor-pointer"
            >
              今月へ
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-12">
          {Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const key = `${year}-${String(m).padStart(2, "0")}`;
            const selected = key === month;
            const isNow = key === currentMonthKey();
            const hasData = monthsWithData.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMonth(key)}
                className={cn(
                  "relative h-11 rounded-lg text-sm font-semibold transition-colors cursor-pointer",
                  selected
                    ? "bg-brand-600 text-white shadow-sm"
                    : isNow
                      ? "border border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100"
                      : "border border-neutral-100 bg-neutral-50/60 text-neutral-600 hover:bg-neutral-100"
                )}
              >
                {m}月
                {hasData && !selected ? (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-400" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* 月次サマリー */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <SummaryCard label={`${monthLabel(month)}の売上`} value={yen(summary.revenueTotal)} />
        <SummaryCard label={`${monthLabel(month)}の原価`} value={yen(summary.costTotal)} />
        <SummaryCard
          label={`${monthLabel(month)}の利益`}
          value={yen(summary.profit)}
          tone={summary.profit < 0 ? "danger" : summary.profit > 0 ? "success" : undefined}
        />
        <SummaryCard
          label="利益率"
          value={summary.profitRate !== null ? pct1(summary.profitRate) : "—"}
          tone={
            summary.profitRate === null
              ? undefined
              : summary.profitRate < 0
                ? "danger"
                : summary.profitRate >= 30
                  ? "success"
                  : undefined
          }
        />
      </div>

      {/* 案件カード */}
      <div className="mt-5">
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-card">
            <EmptyState
              icon={FolderKanban}
              title={`${monthLabel(month)}の案件はありません`}
              description="まずは案件を作成してください。レシートの写真登録もここに反映されます。"
              action={
                <Link href="/app/projects/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    案件を追加
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-card">
            {/* 見出し行（PCのみ） */}
            <div className="hidden items-center gap-3 border-b border-neutral-100 bg-neutral-50/60 px-4 py-2.5 text-[11px] font-semibold text-neutral-400 lg:flex">
              <span className="min-w-0 flex-1">案件</span>
              <span className="w-20 text-center">ステータス</span>
              <span className="w-28 text-right">売上</span>
              <span className="w-28 text-right">原価</span>
              <span className="w-28 text-right">利益</span>
              <span className="w-20 text-right">利益率</span>
              <span className="w-4" />
            </div>
            <div className="divide-y divide-neutral-100">
              {projects.map((project) => {
                const fin = projectFinance(project.id, db);
                return (
                  <Link
                    key={project.id}
                    href={`/app/projects/${project.id}`}
                    className="block px-4 py-3.5 transition-colors hover:bg-neutral-50 lg:flex lg:items-center lg:gap-3"
                  >
                    {/* 案件名・顧客名（スマホはステータスを右端に） */}
                    <div className="flex min-w-0 items-center gap-2 lg:flex-1">
                      <span
                        className="h-4 w-1.5 shrink-0 rounded-full"
                        style={{ background: project.color }}
                      />
                      <span className="truncate text-sm font-bold text-neutral-900">
                        {project.name}
                      </span>
                      {project.customerName ? (
                        <span className="hidden shrink-0 truncate text-xs text-neutral-400 sm:inline">
                          {project.customerName}
                        </span>
                      ) : null}
                      <span className="ml-auto shrink-0 lg:hidden">
                        <StatusBadge meta={PROJECT_STATUSES[project.status]} />
                      </span>
                    </div>
                    <span className="hidden w-20 shrink-0 justify-center lg:flex">
                      <StatusBadge meta={PROJECT_STATUSES[project.status]} />
                    </span>

                    {/* 売上・原価・利益・利益率（スマホは4列・PCは横一列のセル） */}
                    <div className="mt-2.5 grid grid-cols-4 gap-2 lg:mt-0 lg:contents">
                      <div className="lg:w-28 lg:shrink-0">
                        <p className="text-[10px] text-neutral-400 lg:hidden">売上</p>
                        <p className="tnum text-[13px] font-semibold text-neutral-800 lg:text-right">
                          {fin.hasRevenue ? yen(fin.revenueTotal) : "未登録"}
                        </p>
                      </div>
                      <div className="lg:w-28 lg:shrink-0">
                        <p className="text-[10px] text-neutral-400 lg:hidden">原価</p>
                        <p className="tnum text-[13px] font-semibold text-neutral-800 lg:text-right">
                          {yen(fin.costTotal)}
                        </p>
                      </div>
                      <div className="lg:w-28 lg:shrink-0">
                        <p className="text-[10px] text-neutral-400 lg:hidden">利益</p>
                        <p
                          className={cn(
                            "tnum text-[13px] font-bold lg:text-right",
                            fin.profit < 0
                              ? "text-red-600"
                              : fin.isGoodProfit
                                ? "text-emerald-600"
                                : "text-neutral-900"
                          )}
                        >
                          {yen(fin.profit)}
                        </p>
                      </div>
                      <div className="lg:w-20 lg:shrink-0">
                        <p className="text-[10px] text-neutral-400 lg:hidden">利益率</p>
                        <p
                          className={cn(
                            "tnum text-[13px] font-bold lg:text-right",
                            fin.profitRate === null
                              ? "text-neutral-400"
                              : fin.profitRate < 0
                                ? "text-red-600"
                                : fin.profitRate < 20
                                  ? "text-amber-600"
                                  : fin.profitRate >= 30
                                    ? "text-emerald-600"
                                    : "text-neutral-900"
                          )}
                        >
                          {fin.profitRate !== null ? pct1(fin.profitRate) : "—"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-neutral-300 lg:block" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
