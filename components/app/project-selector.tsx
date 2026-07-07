"use client";

import { Check, FileQuestion, Sparkles } from "lucide-react";
import { CONFIDENCE_BADGES, CONFIDENCE_LABELS, type AssignCandidate } from "@/lib/app/assign";
import { Badge } from "@/components/shared/badge";
import { Select } from "@/components/shared/select";
import { PROJECT_STATUSES } from "@/lib/app/constants";
import type { Project } from "@/lib/app/types";
import { cn } from "@/lib/shared/utils";

interface ProjectSelectorProps {
  candidates: AssignCandidate[];
  projects: Project[];
  value: string | null;
  onChange: (id: string | null) => void;
}

/**
 * 案件の割り振り先セレクタ。
 * AIのおすすめ候補（信頼度つき）を上位表示し、手動変更・案件未定も選べる
 */
export function ProjectSelector({ candidates, projects, value, onChange }: ProjectSelectorProps) {
  const top = candidates.slice(0, 3);

  return (
    <div className="space-y-2">
      {top.length > 0 ? (
        <div className="space-y-1.5">
          {top.map((c, i) => {
            const selected = value === c.project.id;
            return (
              <button
                key={c.project.id}
                type="button"
                onClick={() => onChange(c.project.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer",
                  selected
                    ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-brand-600 bg-brand-600 text-white" : "border-neutral-300 bg-white"
                  )}
                >
                  {selected ? <Check className="h-3 w-3" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.project.color }} />
                    <p className="truncate text-[13px] font-semibold text-neutral-900">
                      {c.project.name}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                    {c.project.customerName}・{PROJECT_STATUSES[c.project.status].label}
                    {c.reasons.length > 0 ? `｜${c.reasons[0]}` : ""}
                  </p>
                </div>
                {i === 0 && c.score > 0 ? (
                  <Badge className="border-brand-200 bg-brand-50 text-brand-700">
                    <Sparkles className="h-3 w-3" />
                    AIおすすめ
                  </Badge>
                ) : null}
                <Badge className={CONFIDENCE_BADGES[c.confidence]}>
                  信頼度 {CONFIDENCE_LABELS[c.confidence]}
                </Badge>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="flex-1"
        >
          <option value="">その他の案件から選択…</option>
          {projects
            .filter((p) => p.status !== "lost")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}（{p.customerName}）
              </option>
            ))}
        </Select>
      </div>

      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer",
          value === null
            ? "border-neutral-400 bg-neutral-50 ring-2 ring-neutral-300/40"
            : "border-dashed border-neutral-200 bg-white hover:border-neutral-300"
        )}
      >
        <FileQuestion className="h-4 w-4 shrink-0 text-neutral-400" />
        <div>
          <p className="text-xs font-semibold text-neutral-700">案件未定として保存</p>
          <p className="text-[10px] text-neutral-400">あとから書類一覧で案件に紐づけできます</p>
        </div>
      </button>
    </div>
  );
}
