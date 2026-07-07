"use client";

import { List, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppPageHeader, PageContainer } from "@/components/app/app-page-header";
import { ProjectCard } from "@/components/app/project-card";
import { Button } from "@/components/shared/button";
import { PageSkeleton } from "@/components/shared/skeleton";
import { toast } from "@/components/shared/toast";
import { projectFinance } from "@/lib/app/calc";
import { BOARD_STATUSES, PROJECT_STATUSES } from "@/lib/app/constants";
import { appPath } from "@/lib/app/routes";
import { updateProject, useDB } from "@/lib/app/data-store";
import type { ProjectStatus } from "@/lib/app/types";
import { yen } from "@/lib/shared/format";
import { cn } from "@/lib/shared/utils";

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
      <AppPageHeader
        title="案件ボード"
        description="ドラッグ&ドロップまたはボタンでステータスを変更できます"
        actions={
          <>
            <Link href={appPath("/projects")}>
              <Button variant="secondary">
                <List className="h-4 w-4" />
                リスト表示
              </Button>
            </Link>
            <Link href={appPath("/projects/new")}>
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
                overColumn === status ? "border-brand-400 bg-brand-50/60" : "border-transparent"
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
                    <ProjectCard
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
