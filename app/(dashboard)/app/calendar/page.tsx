"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { Button } from "@/components/shared/button";
import { Dialog } from "@/components/shared/dialog";
import { PageSkeleton } from "@/components/shared/skeleton";
import { isOverdue, monthLabel, todayISO, yen } from "@/lib/shared/format";
import { useDB } from "@/lib/app/store";
import { cn } from "@/lib/shared/utils";

// ============================================================
// 案件カレンダー
// 開始予定・完了予定・請求予定・入金予定を月表示。期日超過は赤表示
// ============================================================

type EventKind = "start" | "due" | "billing" | "payment";

interface CalEvent {
  kind: EventKind;
  date: string;
  label: string;
  sub: string;
  href: string;
  overdue: boolean;
}

const KIND_META: Record<EventKind, { label: string; chip: string; dot: string }> = {
  start: { label: "開始予定", chip: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  due: { label: "完了予定", chip: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  billing: { label: "請求予定", chip: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  payment: { label: "入金予定", chip: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
};

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

export default function CalendarPage() {
  const db = useDB();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() }; // month: 0-11
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const events = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    const push = (e: CalEvent) => {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    };

    for (const p of db.projects) {
      if (p.status === "lost") continue;
      if (p.startDate) {
        push({
          kind: "start",
          date: p.startDate,
          label: p.name,
          sub: "工事開始予定",
          href: `/app/projects/${p.id}`,
          overdue: false,
        });
      }
      if (p.dueDate) {
        push({
          kind: "due",
          date: p.dueDate,
          label: p.name,
          sub: "完了予定",
          href: `/app/projects/${p.id}`,
          overdue:
            (p.status === "in_progress" || p.status === "ordered") && isOverdue(p.dueDate),
        });
      }
    }

    for (const r of db.revenues) {
      const project = db.projects.find((p) => p.id === r.projectId);
      if (r.billingDueDate && r.status === "unbilled") {
        push({
          kind: "billing",
          date: r.billingDueDate,
          label: project?.name ?? r.title,
          sub: `請求予定 ${yen(r.amount)}`,
          href: `/app/projects/${r.projectId}?tab=revenue`,
          overdue: isOverdue(r.billingDueDate),
        });
      }
      if (r.paymentDueDate && r.status !== "paid") {
        push({
          kind: "payment",
          date: r.paymentDueDate,
          label: project?.name ?? r.title,
          sub: `入金予定 ${yen(r.amount)}`,
          href: `/app/projects/${r.projectId}?tab=revenue`,
          overdue: isOverdue(r.paymentDueDate),
        });
      }
    }

    for (const inv of db.invoices) {
      if (inv.status === "sent" && inv.dueDate) {
        push({
          kind: "payment",
          date: inv.dueDate,
          label: `${inv.customerName} 様`,
          sub: `支払期限 ${yen(inv.total)}（${inv.invoiceNumber}）`,
          href: `/app/invoices/${inv.id}`,
          overdue: isOverdue(inv.dueDate),
        });
      }
    }

    return map;
  }, [db]);

  if (!db.hydrated) return <PageSkeleton />;

  // 月曜はじまりのカレンダーグリッドを生成
  const firstDay = new Date(cursor.year, cursor.month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = todayISO();
  const monthKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  const move = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const selectedEvents = selectedDay ? (events.get(selectedDay) ?? []) : [];

  return (
    <PageContainer>
      <AppPageHeader
        title="カレンダー"
        description="工期・請求・入金の予定を月表示で確認できます"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" onClick={() => move(-1)} aria-label="前の月">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[110px] text-center text-sm font-bold text-neutral-800">
              {monthLabel(monthKey)}
            </span>
            <Button variant="secondary" size="icon" onClick={() => move(1)} aria-label="次の月">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const now = new Date();
                setCursor({ year: now.getFullYear(), month: now.getMonth() });
              }}
            >
              今日
            </Button>
          </div>
        }
      />

      {/* 凡例 */}
      <div className="mb-3 flex flex-wrap gap-3">
        {(Object.keys(KIND_META) as EventKind[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
            <span className={cn("h-2 w-2 rounded-full", KIND_META[k].dot)} />
            {KIND_META[k].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-red-600">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          期日超過
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-card">
        <div className="grid grid-cols-7 border-b border-neutral-100">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={cn(
                "py-2 text-center text-[11px] font-bold",
                i === 5 ? "text-blue-500" : i === 6 ? "text-red-400" : "text-neutral-400"
              )}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            const dayEvents = date ? (events.get(date) ?? []) : [];
            const isToday = date === today;
            return (
              <button
                key={i}
                type="button"
                disabled={!date}
                onClick={() => date && dayEvents.length > 0 && setSelectedDay(date)}
                className={cn(
                  "min-h-[76px] border-b border-r border-neutral-50 p-1.5 text-left align-top transition-colors sm:min-h-[96px]",
                  date && dayEvents.length > 0 && "cursor-pointer hover:bg-brand-50/30",
                  !date && "bg-neutral-50/40"
                )}
              >
                {date ? (
                  <>
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tnum",
                        isToday ? "bg-brand-600 text-white" : "text-neutral-500"
                      )}
                    >
                      {Number(date.slice(8))}
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {dayEvents.slice(0, 3).map((e, j) => (
                        <span
                          key={j}
                          className={cn(
                            "block truncate rounded px-1 py-0.5 text-[9px] font-medium leading-3 sm:text-[10px]",
                            e.overdue ? "bg-red-50 text-red-700" : KIND_META[e.kind].chip
                          )}
                        >
                          {e.overdue ? "超過 " : ""}
                          {e.label}
                        </span>
                      ))}
                      {dayEvents.length > 3 ? (
                        <span className="block px-1 text-[9px] font-medium text-neutral-400">
                          +{dayEvents.length - 3}件
                        </span>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `${Number(selectedDay.slice(5, 7))}月${Number(selectedDay.slice(8))}日の予定` : ""}
      >
        <div className="space-y-2">
          {selectedEvents.map((e, i) => (
            <Link
              key={i}
              href={e.href}
              className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 transition-colors hover:border-neutral-200 hover:bg-neutral-50"
            >
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", e.overdue ? "bg-red-500" : KIND_META[e.kind].dot)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-neutral-900">{e.label}</p>
                <p className="text-[11px] text-neutral-400">{e.sub}</p>
              </div>
              {e.overdue ? (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  期日超過
                </span>
              ) : (
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", KIND_META[e.kind].chip)}>
                  {KIND_META[e.kind].label}
                </span>
              )}
            </Link>
          ))}
        </div>
      </Dialog>
    </PageContainer>
  );
}
