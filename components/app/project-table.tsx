"use client";

import { AlertCircle, FileClock, Files, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CurrencyText } from "@/components/shared/currency-text";
import { DateText } from "@/components/shared/date-text";
import { ProfitBadge } from "@/components/app/profit-badge";
import { StatusBadge } from "@/components/app/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/shared/table";
import type { ProjectFinance } from "@/lib/app/calc";
import { PROJECT_STATUSES } from "@/lib/app/constants";
import { yen } from "@/lib/shared/format";
import type { Project } from "@/lib/app/types";
import { cn } from "@/lib/shared/utils";

export interface ProjectRow {
  project: Project;
  fin: ProjectFinance;
  managerName: string | null;
}

/** 案件一覧（PC: テーブル / スマホ: カード表示） */
export function ProjectTable({ rows }: { rows: ProjectRow[] }) {
  const router = useRouter();

  return (
    <>
      {/* PC: テーブル */}
      <div className="hidden rounded-2xl border border-neutral-200/80 bg-white shadow-card md:block">
        <Table>
          <THead>
            <TH>案件名</TH>
            <TH>ステータス</TH>
            <TH align="right">売上</TH>
            <TH align="right">外注費</TH>
            <TH align="right">材料費</TH>
            <TH align="right">経費</TH>
            <TH align="right">粗利</TH>
            <TH>利益率</TH>
            <TH align="right">未請求</TH>
            <TH align="right">未入金</TH>
            <TH align="center">書類</TH>
            <TH>更新日</TH>
          </THead>
          <TBody>
            {rows.map(({ project, fin, managerName }) => (
              <TR key={project.id} onClick={() => router.push(`/app/projects/${project.id}`)}>
                <TD className="max-w-[240px]">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-9 w-1 shrink-0 rounded-full"
                      style={{ background: project.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-neutral-900">
                        {project.name}
                      </p>
                      <p className="truncate text-[11px] text-neutral-400">
                        {[project.customerName, project.siteAddress, managerName ? `担当 ${managerName}` : null]
                          .filter(Boolean)
                          .join("・")}
                      </p>
                    </div>
                  </div>
                </TD>
                <TD>
                  <StatusBadge meta={PROJECT_STATUSES[project.status]} />
                </TD>
                <TD align="right">
                  <CurrencyText value={fin.revenueTotal} dashZero />
                </TD>
                <TD align="right">
                  <CurrencyText value={fin.orderTotal} dashZero className="text-xs" />
                </TD>
                <TD align="right">
                  <CurrencyText value={fin.materialTotal} dashZero className="text-xs" />
                </TD>
                <TD align="right">
                  <CurrencyText value={fin.expenseTotal} dashZero className="text-xs" />
                </TD>
                <TD align="right">
                  <CurrencyText value={fin.profit} colorBySign dashZero={!fin.hasRevenue && !fin.hasCost} />
                </TD>
                <TD>
                  <ProfitBadge fin={fin} />
                </TD>
                <TD align="right">
                  <CurrencyText value={fin.unbilled} dashZero className={fin.unbilled > 0 ? "text-amber-600" : ""} />
                </TD>
                <TD align="right">
                  <CurrencyText
                    value={fin.unpaidReceivable}
                    dashZero
                    className={fin.unpaidReceivable > 0 ? "text-red-600" : ""}
                  />
                </TD>
                <TD align="center">
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-500 tnum">
                    <Files className="h-3.5 w-3.5 text-neutral-300" />
                    {fin.docCount}
                    {fin.pendingDocCount > 0 ? (
                      <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">
                        {fin.pendingDocCount}
                      </span>
                    ) : null}
                  </span>
                </TD>
                <TD className="text-xs text-neutral-400">
                  <DateText value={project.updatedAt} variant="short" />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      {/* スマホ: カード */}
      <div className="space-y-2.5 md:hidden">
        {rows.map(({ project, fin }) => (
          <Link
            key={project.id}
            href={`/app/projects/${project.id}`}
            className="block overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-card active:bg-neutral-50"
          >
            <div className="flex">
              <span className="w-1.5 shrink-0" style={{ background: project.color }} />
              <div className="min-w-0 flex-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-neutral-900">{project.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                      {project.customerName}
                    </p>
                  </div>
                  <StatusBadge meta={PROJECT_STATUSES[project.status]} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-neutral-400">売上</p>
                    <p className="tnum text-[13px] font-bold text-neutral-800">
                      {fin.hasRevenue ? yen(fin.revenueTotal) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-400">粗利</p>
                    <p
                      className={cn(
                        "tnum text-[13px] font-bold",
                        fin.profit < 0 ? "text-red-600" : "text-neutral-800"
                      )}
                    >
                      {fin.hasRevenue || fin.hasCost ? yen(fin.profit) : "—"}
                    </p>
                  </div>
                  <div className="flex items-end justify-end">
                    <ProfitBadge fin={fin} />
                  </div>
                </div>
                {fin.unbilled > 0 || fin.unpaidReceivable > 0 || fin.pendingDocCount > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {fin.unbilled > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        <FileClock className="h-3 w-3" />
                        未請求 {yen(fin.unbilled)}
                      </span>
                    ) : null}
                    {fin.unpaidReceivable > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        <Wallet className="h-3 w-3" />
                        未入金 {yen(fin.unpaidReceivable)}
                      </span>
                    ) : null}
                    {fin.pendingDocCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                        <AlertCircle className="h-3 w-3" />
                        要確認書類 {fin.pendingDocCount}件
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
