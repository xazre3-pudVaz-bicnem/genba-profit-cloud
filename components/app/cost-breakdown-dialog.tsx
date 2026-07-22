"use client";

import { FileText, Pencil, Receipt, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CostForm } from "@/components/app/cost-form";
import { CurrencyText } from "@/components/shared/currency-text";
import { ConfirmDialog, Dialog } from "@/components/shared/dialog";
import { toast } from "@/components/shared/toast";
import { COST_TYPES, EXPENSE_CATEGORIES } from "@/lib/app/constants";
import { removeCost, useDB, useSession } from "@/lib/app/data-store";
import { canEditData } from "@/lib/app/permissions";
import { shortDate, yen } from "@/lib/shared/format";
import type { Cost, CostType } from "@/lib/app/types";
import { cn } from "@/lib/shared/utils";

// ============================================================
// 案件の原価一覧モーダル（案件一覧の「原価」タップで表示）
// 材料費・外注費・経費の内訳と明細を、その場で確認できる
// ============================================================

const TYPE_DOTS: Record<CostType, string> = {
  material: "bg-amber-400",
  order: "bg-indigo-400",
  expense: "bg-slate-400",
};

export function CostBreakdownDialog({
  projectId,
  onClose,
}: {
  projectId: string | null;
  onClose: () => void;
}) {
  const db = useDB();
  const session = useSession();
  const editable = canEditData(session?.role);
  const [editing, setEditing] = useState<Cost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cost | null>(null);

  const project = projectId ? db.projects.find((p) => p.id === projectId) : null;
  const costs = projectId
    ? db.costs
        .filter((c) => c.projectId === projectId)
        .sort((a, b) => (b.purchaseDate ?? "").localeCompare(a.purchaseDate ?? ""))
    : [];

  const totalOf = (type: CostType) =>
    costs.filter((c) => c.type === type).reduce((acc, c) => acc + c.amount, 0);
  const materialTotal = totalOf("material");
  const orderTotal = totalOf("order");
  const expenseTotal = totalOf("expense");
  const costTotal = materialTotal + orderTotal + expenseTotal;

  return (
    <>
      <Dialog
        open={project !== null}
        onClose={onClose}
        title={project ? `${project.name} の原価` : ""}
        description={project ? `原価合計 ${yen(costTotal)}` : undefined}
        size="lg"
      >
        {project ? (
          <div className="space-y-4">
            {/* 種別ごとの合計 */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "材料費合計", value: materialTotal, dot: "bg-amber-400" },
                { label: "外注費合計", value: orderTotal, dot: "bg-indigo-400" },
                { label: "経費合計", value: expenseTotal, dot: "bg-slate-400" },
                { label: "原価合計", value: costTotal, dot: "bg-neutral-800" },
              ].map((row) => (
                <div key={row.label} className="rounded-xl bg-neutral-50 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400">
                    <span className={cn("h-2 w-2 rounded-[3px]", row.dot)} />
                    {row.label}
                  </p>
                  <p className="tnum mt-1 text-sm font-bold text-neutral-900">{yen(row.value)}</p>
                </div>
              ))}
            </div>

            {/* 明細 */}
            {costs.length === 0 ? (
              <p className="py-8 text-center text-xs text-neutral-400">
                原価はまだ登録されていません。写真登録から追加できます。
              </p>
            ) : (
              <div className="max-h-[45vh] divide-y divide-neutral-50 overflow-y-auto rounded-xl border border-neutral-100">
                {costs.map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5 px-3 py-2.5">
                    <span
                      className={cn(
                        "h-8 w-1.5 shrink-0 rounded-full",
                        TYPE_DOTS[c.type]
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-neutral-800">
                        {c.vendorName || c.title || COST_TYPES[c.type].shortLabel}
                      </p>
                      <p className="truncate text-[11px] text-neutral-400">
                        {[
                          COST_TYPES[c.type].shortLabel,
                          shortDate(c.purchaseDate),
                          c.title && c.vendorName ? c.title : null,
                          c.category ? EXPENSE_CATEGORIES[c.category] : null,
                          c.memo || null,
                        ]
                          .filter(Boolean)
                          .join("・")}
                      </p>
                    </div>
                    <CurrencyText value={c.amount} className="w-24 shrink-0 text-right text-[13px]" />
                    {c.documentId ? (
                      <Link
                        href={`/app/projects/${project.id}?tab=documents`}
                        className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                        aria-label="書類を見る"
                        title="書類を見る"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                    {editable ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(c)}
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
                          aria-label="編集"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          aria-label="削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Link
                href={`/app/documents/upload?project=${project.id}`}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
              >
                <Receipt className="h-3.5 w-3.5" />
                レシートから追加する
              </Link>
              <Link
                href={`/app/projects/${project.id}`}
                className="text-xs font-medium text-neutral-500 hover:underline"
              >
                案件詳細を見る
              </Link>
            </div>
          </div>
        ) : null}
      </Dialog>

      {project ? (
        <CostForm
          open={editing !== null}
          onClose={() => setEditing(null)}
          projectId={project.id}
          cost={editing}
          defaultType={editing?.type ?? "material"}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`「${deleteTarget?.vendorName || deleteTarget?.title || ""}」を削除しますか？`}
        description="削除すると案件の収支に即時反映されます。この操作は取り消せません。"
        onConfirm={() => {
          if (deleteTarget) {
            removeCost(deleteTarget.id);
            toast({ title: "削除しました" });
          }
        }}
      />
    </>
  );
}
