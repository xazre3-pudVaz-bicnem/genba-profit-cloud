"use client";

import { useState } from "react";
import type { MonthlyPoint } from "@/lib/calc";
import { monthShortLabel, yen } from "@/lib/format";
import { cn } from "@/lib/utils";

// ============================================================
// 月次推移チャート（売上 vs 原価のグループ棒 + ホバーで粗利表示）
// 配色はCVD検証済み: 売上 #ea580c / 原価 #2a78d6
// ============================================================

const REVENUE_COLOR = "#ea580c";
const COST_COLOR = "#2a78d6";

const W = 640;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 44 };

/** 上端だけ4px角丸の棒（ベースラインは直角） */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return "";
  const r = Math.min(4, h, w / 2);
  return [
    `M${x},${y + h}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + w - r},${y}`,
    `Q${x + w},${y} ${x + w},${y + r}`,
    `L${x + w},${y + h}`,
    "Z",
  ].join(" ");
}

/** きれいな上限値（1/2/5×10^n）に丸める */
function niceMax(v: number): number {
  if (v <= 0) return 100000;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** 「350万」のような日本式の軸ラベル */
function axisLabel(v: number): string {
  if (v === 0) return "0";
  if (v >= 100000000) return `${v / 100000000}億`;
  return `${Math.round(v / 10000)}万`;
}

export function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.revenue, d.cost)), 1));
  const band = plotW / Math.max(data.length, 1);
  const barW = Math.min(24, band * 0.28);
  const gap = 2;

  const yOf = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  return (
    <div className="relative">
      {/* 凡例（2系列のため必須） */}
      <div className="mb-2 flex items-center justify-end gap-4 pr-1">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: REVENUE_COLOR }} />
          売上
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: COST_COLOR }} />
          原価
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="月次の売上と原価の推移">
        {/* グリッド線（ヘアライン・実線） */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yOf(t)}
              y2={yOf(t)}
              stroke={t === 0 ? "#d4d4d4" : "#ececec"}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={yOf(t) + 3.5}
              textAnchor="end"
              fontSize={10}
              fill="#8f8f8f"
              className="tnum"
            >
              {axisLabel(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = PAD.left + band * i + band / 2;
          const x1 = cx - barW - gap / 2;
          const x2 = cx + gap / 2;
          const yR = yOf(d.revenue);
          const yC = yOf(d.cost);
          const dim = hover !== null && hover !== i;
          return (
            <g key={d.key} opacity={dim ? 0.35 : 1} style={{ transition: "opacity 0.15s" }}>
              <path d={barPath(x1, yR, barW, PAD.top + plotH - yR)} fill={REVENUE_COLOR} />
              <path d={barPath(x2, yC, barW, PAD.top + plotH - yC)} fill={COST_COLOR} />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize={10.5} fill="#8f8f8f">
                {monthShortLabel(d.key)}
              </text>
              {/* ホバー領域（マークより大きいヒットターゲット） */}
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          );
        })}
      </svg>

      {/* ツールチップ */}
      {hover !== null && data[hover] ? (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 shadow-pop backdrop-blur"
          style={{
            left: `${Math.min(78, Math.max(2, ((PAD.left + band * hover + band / 2) / W) * 100 - 11))}%`,
          }}
        >
          <p className="text-[11px] font-bold text-neutral-700">
            {monthShortLabel(data[hover].key)}
          </p>
          <div className="mt-1 space-y-0.5 text-[11px]">
            <p className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-neutral-500">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: REVENUE_COLOR }} />
                売上
              </span>
              <span className="tnum font-semibold text-neutral-800">{yen(data[hover].revenue)}</span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-neutral-500">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: COST_COLOR }} />
                原価
              </span>
              <span className="tnum font-semibold text-neutral-800">{yen(data[hover].cost)}</span>
            </p>
            <p className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-0.5">
              <span className="text-neutral-500">粗利</span>
              <span
                className={cn(
                  "tnum font-bold",
                  data[hover].profit < 0 ? "text-red-600" : "text-neutral-900"
                )}
              >
                {yen(data[hover].profit)}
              </span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
