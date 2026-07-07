"use client";

import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ProfitBadge } from "@/components/app/profit-badge";
import { toast } from "@/components/shared/toast";
import type { ProjectFinance } from "@/lib/app/calc";
import { BOARD_STATUSES, PROJECT_STATUSES } from "@/lib/app/constants";
import { appPath } from "@/lib/app/routes";
import { updateProject } from "@/lib/app/data-store";
import { daysUntil, shortDate, yen } from "@/lib/shared/format";
import type { Project } from "@/lib/app/types";
import { cn } from "@/lib/shared/utils";

function moveStatus(project: Project, dir: -1 | 1) {
  const idx = BOARD_STATUSES.indexOf(project.status);
  const next = BOARD_STATUSES[idx + dir];
  if (!next) return;
  updateProject(project.id, { status: next });
  toast({ title: `「${project.name}」を${PROJECT_STATUSES[next].label}へ移動しました` });
}

interface ProjectCardProps {
  project: Project;
  fin: ProjectFinance;
  dragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/** 案件ボード用カード（D&D + ボタンでのステータス移動） */
export function ProjectCard({ project, fin, dragging, onDragStart, onDragEnd }: ProjectCardProps) {
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
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group cursor-grab rounded-xl border border-neutral-200/80 bg-white p-3 shadow-card transition-all active:cursor-grabbing",
        dragging && "opacity-40 rotate-1"
      )}
    >
      <Link href={appPath(`/projects/${project.id}`)} className="block">
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
