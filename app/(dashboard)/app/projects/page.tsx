"use client";

import { ChevronLeft, ChevronRight, FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSkeleton } from "@/components/shared/skeleton";
import { monthSummary, projectFinance, projectsForMonth } from "@/lib/app/calc";
import { PROJECT_STATUSES } from "@/lib/app/constants";
import { useDB } from "@/lib/app/data-store";
import { currentMonthKey, monthLabel, pct1, shiftMonthKey, yen } from "@/lib/shared/format";
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

      {/* 年月切り替え */}
      <div className="mb-2 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setMonth(shiftMonthKey(month, -1))}
          className="flex h-11 items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-semibold text-neutral-600 shadow-sm hover:bg-neutral-50 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          前の月
        </button>
        <p className="w-36 text-center text-lg font-bold tracking-tight text-neutral-900">
          {monthLabel(month)}
        </p>
        <button
          type="button"
          onClick={() => setMonth(shiftMonthKey(month, 1))}
          className="flex h-11 items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-semibold text-neutral-600 shadow-sm hover:bg-neutral-50 cursor-pointer"
        >
          次の月
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-4 h-4 text-center">
        {!isCurrentMonth ? (
          <button
            type="button"
            onClick={() => setMonth(currentMonthKey())}
            className="text-xs font-medium text-brand-600 hover:underline cursor-pointer"
          >
            今月に戻る
          </button>
        ) : null}
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const fin = projectFinance(project.id, db);
              return (
                <div
                  key={project.id}
                  className="flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-card transition-all hover:border-neutral-300 hover:shadow-pop"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[15px] font-bold text-neutral-900">
                        <span
                          className="h-4 w-1.5 shrink-0 rounded-full"
                          style={{ background: project.color }}
                        />
                        <span className="truncate">{project.name}</span>
                      </p>
                      {project.customerName ? (
                        <p className="mt-0.5 pl-3.5 text-xs text-neutral-400">{project.customerName}</p>
                      ) : null}
                    </div>
                    <StatusBadge meta={PROJECT_STATUSES[project.status]} />
                  </div>

                  <dl className="mt-4 space-y-2 border-t border-neutral-100 pt-3.5">
                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-neutral-400">売上</dt>
                      <dd className="tnum text-sm font-semibold text-neutral-800">
                        {fin.hasRevenue ? yen(fin.revenueTotal) : "未登録"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-neutral-400">原価</dt>
                      <dd className="tnum text-sm font-semibold text-neutral-800">{yen(fin.costTotal)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-neutral-400">利益</dt>
                      <dd
                        className={cn(
                          "tnum text-sm font-bold",
                          fin.isDeficit ? "text-red-600" : fin.isGoodProfit ? "text-emerald-600" : "text-neutral-900"
                        )}
                      >
                        {yen(fin.profit)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-neutral-400">利益率</dt>
                      <dd
                        className={cn(
                          "tnum text-sm font-bold",
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
                      </dd>
                    </div>
                  </dl>

                  <Link href={`/app/projects/${project.id}`} className="mt-4">
                    <Button variant="secondary" className="w-full">
                      詳細を見る
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
