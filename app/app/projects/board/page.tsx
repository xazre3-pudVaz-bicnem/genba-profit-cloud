"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, List, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { ProfitBadge } from "@/components/app/profit-badge";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { projectFinance, type ProjectFinance } from "@/lib/calc";
import { BOARD_STATUSES, PROJECT_STATUSES } from "@/lib/constants";
import { daysUntil, shortDate, yen } from "@/lib/format";
import { updateProject, useDB } from "@/lib/store";
import type { Project, ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function moveStatus(project: Project, dir: -1 | 1) {
  const idx = BOARD_STATUSES.indexOf(project.status);
  const next = BOARD_STATUSES[idx + dir];
  if (!next) return;
  updateProject(project.id, { status: next });
  toast({ title: `「${project.name}」を${PROJECT_STATUSES[next].label}へ移動しました` });
}

function BoardCard({
  project,
  fin,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  project: Project;
  fin: ProjectFinance;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const idx = BOARD_STATUSES.indexOf(project.status);
  const overdue =
    (project.status === "in_progress" || project.status === "ordered") &&
    (daysUntil(project.dueDate) ?? 1) < 0;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", project.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group cursor-grab rounded-xl border border-neutral-200/80 bg-white p-3 shadow-card transition-all active:cursor-grabbing",
        dragging && "opacity-40 rotate-1"
      )}
    >
      <Link href={`/app/projects/${project.id}`} className="block">
        <div className="flex items-start gap-2">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: project.color }} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-snug text-neutral-900">{project.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-neutral-400">{project.customerName}</p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="tnum text-xs font-bold text-neutral-800">
            {fin.hasRevenue ? yen(fin.revenueTotal) : "売上未登録"}
          </span>
          <ProfitBadge fin={fin} />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px]",
              overdue ? "font-bold text-red-600" : "text-neutral-400"
            )}
          >
            {overdue ? <AlertTriangle className="h-3 w-3" /> : null}
            {project.dueDate ? `完了予定 ${shortDate(project.dueDate)}` : "完了予定 未定"}
          </span>
          <span className="tnum text-[10px] text-neutral-400">粗利 {yen(fin.profit)}</span>
        </div>
      </Link>
      {/* ステータス移動ボタン（D&Dが使えない環境向け） */}
      <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2">
        <button
          type="button"
          disabled={idx <= 0}
          onClick={() => moveStatus(project, -1)}
          className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-medium text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
        >
          <ChevronLeft className="h-3 w-3" />
          {idx > 0 ? PROJECT_STATUSES[BOARD_STATUSES[idx - 1]].label : "—"}
        </button>
        <button
          type="button"
          disabled={idx >= BOARD_STATUSES.length - 1}
          onClick={() => moveStatus(project, 1)}
          className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-30 cursor-pointer"
        >
          {idx < BOARD_STATUSES.length - 1 ? PROJECT_STATUSES[BOARD_STATUSES[idx + 1]].label : "—"}
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const db = useDB();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ProjectStatus | null>(null);

  if (!db.hydrated) return <PageSkeleton />;

  const drop = (status: ProjectStatus, e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    setOverColumn(null);
    setDraggingId(null);
    if (!id) return;
    const project = db.projects.find((p) => p.id === id);
    if (!project || project.status === status) return;
    updateProject(id, { status });
    toast({ title: `「${project.name}」を${PROJECT_STATUSES[status].label}へ移動しました` });
  };

  return (
    <PageContainer className="max-w-none">
      <PageHeader
        title="案件ボード"
        description="ドラッグ&ドロップまたはボタンでステータスを変更できます"
        actions={
          <>
            <Link href="/app/projects">
              <Button variant="secondary">
                <List className="h-4 w-4" />
                リスト表示
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

      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        {BOARD_STATUSES.map((status) => {
          const items = db.projects
            .filter((p) => p.status === status)
            .map((p) => ({ project: p, fin: projectFinance(p.id, db) }))
            .sort((a, b) => b.project.updatedAt.localeCompare(a.project.updatedAt));
          const columnTotal = items.reduce((acc, i) => acc + i.fin.revenueTotal, 0);
          const meta = PROJECT_STATUSES[status];

          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setOverColumn(status);
              }}
              onDragLeave={() => setOverColumn((c) => (c === status ? null : c))}
              onDrop={(e) => drop(status, e)}
              className={cn(
                "flex w-[280px] shrink-0 snap-start flex-col rounded-2xl border bg-neutral-100/70 transition-colors",
                overColumn === status
                  ? "border-brand-400 bg-brand-50/60"
                  : "border-transparent"
              )}
            >
              <div className="flex items-center justify-between px-3.5 pb-2 pt-3">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                  <span className="text-xs font-bold text-neutral-700">{meta.label}</span>
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-neutral-500 tnum">
                    {items.length}
                  </span>
                </div>
                <span className="tnum text-[10px] text-neutral-400">{yen(columnTotal)}</span>
              </div>
              <div className="flex-1 space-y-2 px-2.5 pb-3">
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-[11px] text-neutral-400">
                    案件なし
                  </div>
                ) : (
                  items.map(({ project, fin }) => (
                    <BoardCard
                      key={project.id}
                      project={project}
                      fin={fin}
                      dragging={draggingId === project.id}
                      onDragStart={() => setDraggingId(project.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverColumn(null);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
