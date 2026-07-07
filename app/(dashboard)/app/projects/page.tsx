"use client";

import { FolderKanban, Plus, Search, SquareKanban } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { ProjectTable, type ProjectRow } from "@/components/app/project-table";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/shared/input";
import { PageSkeleton } from "@/components/shared/skeleton";
import { FilterChips } from "@/components/shared/tabs";
import { Select } from "@/components/shared/select";
import { projectFinance } from "@/lib/app/calc";
import { PROJECT_STATUSES, PROJECT_STATUS_ORDER } from "@/lib/app/constants";
import { yen } from "@/lib/shared/format";
import { useDB } from "@/lib/app/store";
import type { ProjectStatus } from "@/lib/app/types";

type QuickFilter = "all" | "unbilled" | "unpaid" | "low_profit" | "deficit" | "pending_docs";
type SortKey = "updated" | "revenue" | "profit" | "rate_asc" | "rate_desc" | "due";

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "unbilled", label: "未請求あり" },
  { value: "unpaid", label: "未入金あり" },
  { value: "low_profit", label: "利益率が低い" },
  { value: "deficit", label: "赤字" },
  { value: "pending_docs", label: "書類未確認あり" },
];

function ProjectsContent() {
  const db = useDB();
  const params = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">(
    (params.get("status") as ProjectStatus) || "all"
  );
  const [quick, setQuick] = useState<QuickFilter>((params.get("filter") as QuickFilter) || "all");
  const [managerId, setManagerId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");

  const rows = useMemo<ProjectRow[]>(() => {
    if (!db.hydrated) return [];
    const q = search.trim().toLowerCase();

    let list = db.projects.map((project) => ({
      project,
      fin: projectFinance(project.id, db),
      managerName: db.members.find((m) => m.id === project.managerId)?.name ?? null,
    }));

    if (q) {
      list = list.filter(({ project }) =>
        [project.name, project.customerName, project.siteAddress, project.memo, ...project.tags]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (status !== "all") list = list.filter(({ project }) => project.status === status);
    if (managerId !== "all") list = list.filter(({ project }) => project.managerId === managerId);
    if (from) {
      list = list.filter(({ project }) => {
        const d = project.dueDate ?? project.startDate;
        return d !== null && d >= from;
      });
    }
    if (to) {
      list = list.filter(({ project }) => {
        const d = project.startDate ?? project.dueDate;
        return d !== null && d <= to;
      });
    }

    switch (quick) {
      case "unbilled":
        list = list.filter(({ fin }) => fin.unbilled > 0);
        break;
      case "unpaid":
        list = list.filter(({ fin }) => fin.unpaidReceivable > 0);
        break;
      case "low_profit":
        list = list.filter(({ fin }) => fin.isLowProfit || fin.isDeficit);
        break;
      case "deficit":
        list = list.filter(({ fin }) => fin.isDeficit);
        break;
      case "pending_docs":
        list = list.filter(({ fin }) => fin.pendingDocCount > 0);
        break;
    }

    switch (sort) {
      case "updated":
        list.sort((a, b) => b.project.updatedAt.localeCompare(a.project.updatedAt));
        break;
      case "revenue":
        list.sort((a, b) => b.fin.revenueTotal - a.fin.revenueTotal);
        break;
      case "profit":
        list.sort((a, b) => b.fin.profit - a.fin.profit);
        break;
      case "rate_asc":
        list.sort((a, b) => (a.fin.profitRate ?? 999) - (b.fin.profitRate ?? 999));
        break;
      case "rate_desc":
        list.sort((a, b) => (b.fin.profitRate ?? -999) - (a.fin.profitRate ?? -999));
        break;
      case "due":
        list.sort((a, b) =>
          (a.project.dueDate ?? "9999-99-99").localeCompare(b.project.dueDate ?? "9999-99-99")
        );
        break;
    }

    return list;
  }, [db, search, status, quick, managerId, from, to, sort]);

  if (!db.hydrated) return <PageSkeleton />;

  const totalRevenue = rows.reduce((acc, r) => acc + r.fin.revenueTotal, 0);
  const totalProfit = rows.reduce((acc, r) => acc + r.fin.profit, 0);

  const statusChips = [
    { value: "all", label: "すべて", count: db.projects.length },
    ...PROJECT_STATUS_ORDER.map((s) => ({
      value: s,
      label: PROJECT_STATUSES[s].label,
      count: db.projects.filter((p) => p.status === s).length,
    })),
  ];

  return (
    <PageContainer>
      <AppPageHeader
        title="案件"
        description="全案件の収支状況を一覧で確認できます"
        actions={
          <>
            <Link href="/app/projects/board">
              <Button variant="secondary">
                <SquareKanban className="h-4 w-4" />
                ボード表示
              </Button>
            </Link>
            <Link href="/app/projects/new">
              <Button>
                <Plus className="h-4 w-4" />
                新規案件
              </Button>
            </Link>
          </>
        }
      />

      {/* 検索・フィルタ */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="案件名・顧客名・住所・メモで検索"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full sm:w-36"
            >
              <option value="all">担当者: 全員</option>
              {db.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="w-full sm:w-44"
            >
              <option value="updated">並び: 更新日が新しい順</option>
              <option value="revenue">並び: 売上が大きい順</option>
              <option value="profit">並び: 利益が大きい順</option>
              <option value="rate_asc">並び: 利益率が低い順</option>
              <option value="rate_desc">並び: 利益率が高い順</option>
              <option value="due">並び: 完了予定日が近い順</option>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <FilterChips
            items={statusChips}
            value={status}
            onChange={(v) => setStatus(v as ProjectStatus | "all")}
          />
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[136px] text-xs" />
            <span className="text-xs text-neutral-400">〜</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-[136px] text-xs" />
          </div>
        </div>
        <FilterChips items={QUICK_FILTERS} value={quick} onChange={(v) => setQuick(v as QuickFilter)} />
      </div>

      {/* 集計 */}
      <p className="mb-3 text-xs text-neutral-500 tnum">
        {rows.length}件 ・ 売上合計 <span className="font-bold text-neutral-800">{yen(totalRevenue)}</span>
        {" ・ "}粗利合計{" "}
        <span className={totalProfit < 0 ? "font-bold text-red-600" : "font-bold text-neutral-800"}>
          {yen(totalProfit)}
        </span>
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-card">
          <EmptyState
            icon={FolderKanban}
            title="条件に合う案件がありません"
            description="検索条件を変更するか、新しい案件を作成してください。"
            action={
              <Link href="/app/projects/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  新規案件を作成
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <ProjectTable rows={rows} />
      )}
    </PageContainer>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectsContent />
    </Suspense>
  );
}
