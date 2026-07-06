"use client";

import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** 横スクロール可能なタブバー */
export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div className={cn("border-b border-neutral-200", className)}>
      <div className="no-scrollbar -mb-px flex gap-1 overflow-x-auto">
        {items.map((item) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
              )}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tnum",
                    active ? "bg-brand-100 text-brand-700" : "bg-neutral-100 text-neutral-500"
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** フィルタ用のチップ型タブ */
export function FilterChips({ items, value, onChange, className }: TabsProps) {
  return (
    <div className={cn("no-scrollbar flex gap-1.5 overflow-x-auto", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              active
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
            )}
          >
            {item.label}
            {item.count !== undefined && item.count > 0 ? (
              <span className={cn("tnum text-[10px]", active ? "text-neutral-300" : "text-neutral-400")}>
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
