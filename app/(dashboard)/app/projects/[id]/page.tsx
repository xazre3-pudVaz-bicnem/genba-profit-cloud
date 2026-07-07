"use client";

import {
  AlertTriangle,
  Camera,
  FileSpreadsheet,
  FileText,
  Files,
  FolderX,
  MapPin,
  Pencil,
  Plus,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CostForm } from "@/components/app/cost-form";
import { DocThumb } from "@/components/app/doc-thumb";
import { CurrencyText } from "@/components/shared/currency-text";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { ProfitBadge } from "@/components/app/profit-badge";
import { ProjectForm } from "@/components/app/project-form";
import { RevenueForm } from "@/components/app/revenue-form";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/shared/button";
import { Card, CardHeader } from "@/components/shared/card";
import { ConfirmDialog } from "@/components/shared/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSkeleton } from "@/components/shared/skeleton";
import { Select } from "@/components/shared/select";
import { Tabs } from "@/components/shared/tabs";
import { Textarea } from "@/components/shared/textarea";
import { toast } from "@/components/shared/toast";
import { projectFinance } from "@/lib/app/calc";
import {
  COST_STATUSES,
  COST_TYPES,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  ESTIMATE_STATUSES,
  EXPENSE_CATEGORIES,
  INVOICE_STATUSES,
  PROJECT_STATUSES,
  PROJECT_STATUS_ORDER,
  REVENUE_STATUSES,
} from "@/lib/app/constants";
import { formatDate, pct1, shortDate, yen } from "@/lib/shared/format";
import {
  removeCost,
  removeProject,
  removeRevenue,
  updateProject,
  useDB,
} from "@/lib/app/data-store";
import type { Cost, CostType, ProjectStatus, Revenue } from "@/lib/app/types";
import { cn } from "@/lib/shared/utils";

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "warning" | "success";
}) {
  return (
    <div className="rounded-xl border border-neutral-200/80 bg-white p-3 shadow-card">
      <p className="text-[10px] font-medium text-neutral-400">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-bold tracking-tight sm:text-base",
          tone === "danger"
            ? "text-red-600"
            : tone === "warning"
              ? "text-amber-600"
              : tone === "success"
                ? "text-emerald-600"
                : "text-neutral-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-neutral-400">{label}</p>
        <p className="text-xs font-medium text-neutral-800">{value || "—"}</p>
      </div>
    </div>
  );
}

function ProjectDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useDB();

  const [tab, setTab] = useState(searchParams.get("tab") ?? "overview");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [revenueForm, setRevenueForm] = useState<{ open: boolean; editing: Revenue | null }>({ open: false, editing: null });
  const [costForm, setCostForm] = useState<{ open: boolean; editing: Cost | null; type: CostType }>({ open: false, editing: null, type: "material" });
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "revenue" | "cost"; id: string; label: string } | null>(null);
  const [memoDraft, setMemoDraft] = useState<string | null>(null);

  const project = db.projects.find((p) => p.id === params.id);

  useEffect(() => {
    setMemoDraft(null);
  }, [project?.id]);

  if (!db.hydrated) return <PageSkeleton />;

  if (!project) {
    return (
      <PageContainer>
        <EmptyState
          icon={FolderX}
          title="案件が見つかりません"
          description="削除されたか、URLが間違っている可能性があります。"
          action={
            <Link href="/app/projects">
              <Button variant="secondary">案件一覧へ戻る</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const fin = projectFinance(project.id, db);
  const manager = db.members.find((m) => m.id === project.managerId);
  const revenues = db.revenues
    .filter((r) => r.projectId === project.id)
    .sort((a, b) => (b.billedDate ?? b.billingDueDate ?? "").localeCompare(a.billedDate ?? a.billingDueDate ?? ""));
  const costsOf = (type: CostType) =>
    db.costs
      .filter((c) => c.projectId === project.id && c.type === type)
      .sort((a, b) => (b.purchaseDate ?? "").localeCompare(a.purchaseDate ?? ""));
  const documents = db.documents.filter((d) => d.projectId === project.id);
  const estimates = db.estimates.filter((e) => e.projectId === project.id);
  const invoices = db.invoices.filter((i) => i.projectId === project.id);

  const tabs = [
    { value: "overview", label: "概要" },
    { value: "revenue", label: "売上", count: revenues.length },
    { value: "order", label: "発注費", count: costsOf("order").length },
    { value: "material", label: "材料費", count: costsOf("material").length },
    { value: "expense", label: "経費", count: costsOf("expense").length },
    { value: "documents", label: "書類", count: documents.length },
    { value: "estimates", label: "見積", count: estimates.length },
    { value: "invoices", label: "請求", count: invoices.length },
    { value: "memo", label: "メモ" },
  ];

  const openCostForm = (type: CostType, editing: Cost | null = null) =>
    setCostForm({ open: true, editing, type });

  const costTab = (type: CostType) => {
    const items = costsOf(type);
    const total = items.reduce((acc, c) => acc + c.amount, 0);
    return (
      <Card>
        <CardHeader
          title={`${COST_TYPES[type].shortLabel}合計 ${yen(total)}`}
          description={`${items.length}件の登録`}
          action={
            <Button size="sm" onClick={() => openCostForm(type)}>
              <Plus className="h-3.5 w-3.5" />
              追加
            </Button>
          }
        />
        <div className="mt-2 px-2 pb-3">
          {items.length === 0 ? (
            <EmptyState
              icon={Files}
              title={`${COST_TYPES[type].shortLabel}はまだ登録されていません`}
              description={
                type === "material"
                  ? "レシートを写真で撮ると自動で登録できます。"
                  : "右上の「追加」から登録できます。"
              }
              action={
                type === "material" ? (
                  <Link href={`/app/documents/upload?project=${project.id}`}>
                    <Button variant="secondary" size="sm">
                      <Camera className="h-3.5 w-3.5" />
                      レシートを撮る
                    </Button>
                  </Link>
                ) : undefined
              }
              className="py-8"
            />
          ) : (
            <div className="divide-y divide-neutral-50">
              {items.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-neutral-800">
                      {c.vendorName || c.title}
                    </p>
                    <p className="truncate text-[11px] text-neutral-400">
                      {[
                        c.title && c.vendorName ? c.title : null,
                        c.category ? EXPENSE_CATEGORIES[c.category] : null,
                        shortDate(c.purchaseDate),
                      ]
                        .filter(Boolean)
                        .join("・")}
                    </p>
                  </div>
                  <StatusBadge meta={COST_STATUSES[c.status]} />
                  <CurrencyText value={c.amount} className="w-24 text-right text-[13px]" />
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      onClick={() => openCostForm(type, c)}
                      className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
                      aria-label="編集"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDelete({ kind: "cost", id: c.id, label: c.vendorName || c.title })
                      }
                      className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                      aria-label="削除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const costBreakdownTotal = fin.costTotal || 1;

  return (
    <PageContainer>
      <AppPageHeader
        backHref="/app/projects"
        backLabel="案件一覧"
        title={
          <span className="flex items-center gap-2.5">
            <span className="h-5 w-1.5 rounded-full" style={{ background: project.color }} />
            {project.name}
          </span>
        }
        description={`${project.customerName}${project.siteAddress ? `・${project.siteAddress}` : ""}`}
        actions={
          <>
            <Select
              value={project.status}
              onChange={(e) => {
                updateProject(project.id, { status: e.target.value as ProjectStatus });
                toast({ title: `ステータスを「${PROJECT_STATUSES[e.target.value as ProjectStatus].label}」に変更しました` });
              }}
              className="w-32"
            >
              {PROJECT_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUSES[s].label}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              編集
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteOpen(true)}
              aria-label="案件を削除"
              className="text-neutral-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        }
      />

      {/* 警告バナー */}
      {fin.isDeficit ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="text-xs font-medium text-red-700">
            この案件は赤字です（粗利 {yen(fin.profit)}）。追加請求や原価の見直しを検討してください。
          </p>
        </div>
      ) : fin.costOnly ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs font-medium text-amber-700">
            原価のみ登録されています。売上（契約金額）を登録すると利益が計算されます。
          </p>
        </div>
      ) : null}

      {/* 収支サマリー */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <MiniStat label="売上" value={fin.hasRevenue ? yen(fin.revenueTotal) : "未登録"} />
        <MiniStat label="発注費" value={yen(fin.orderTotal)} />
        <MiniStat label="材料費" value={yen(fin.materialTotal)} />
        <MiniStat label="その他経費" value={yen(fin.expenseTotal)} />
        <MiniStat
          label="粗利益"
          value={yen(fin.profit)}
          tone={fin.isDeficit ? "danger" : fin.isGoodProfit ? "success" : undefined}
        />
        <MiniStat
          label="利益率"
          value={fin.profitRate !== null ? pct1(fin.profitRate) : "—"}
          tone={
            fin.profitRate === null
              ? undefined
              : fin.profitRate < 0
                ? "danger"
                : fin.profitRate < 20
                  ? "warning"
                  : fin.profitRate >= 30
                    ? "success"
                    : undefined
          }
        />
        <MiniStat label="未請求" value={yen(fin.unbilled)} tone={fin.unbilled > 0 ? "warning" : undefined} />
        <MiniStat
          label="未入金"
          value={yen(fin.unpaidReceivable)}
          tone={fin.unpaidReceivable > 0 ? "danger" : undefined}
        />
      </div>

      <Tabs items={tabs} value={tab} onChange={setTab} className="mt-5 mb-4" />

      {tab === "overview" ? (
        <div className="grid gap-3 lg:grid-cols-3">
          <Card>
            <CardHeader title="基本情報" />
            <div className="divide-y divide-neutral-50 px-5 pb-4">
              <InfoRow icon={User} label="顧客名" value={project.customerName} />
              <InfoRow icon={MapPin} label="現場住所" value={project.siteAddress} />
              <InfoRow icon={User} label="担当者" value={manager?.name ?? ""} />
              <InfoRow
                icon={FileText}
                label="工期"
                value={`${formatDate(project.startDate)} 〜 ${formatDate(project.dueDate)}${
                  project.completedDate ? `（実完了 ${formatDate(project.completedDate)}）` : ""
                }`}
              />
              <InfoRow
                icon={Tag}
                label="タグ"
                value={
                  project.tags.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {project.tags.map((t) => (
                        <span key={t} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
                          {t}
                        </span>
                      ))}
                    </span>
                  ) : (
                    ""
                  )
                }
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="原価の内訳" description={`原価合計 ${yen(fin.costTotal)}`} />
            <div className="px-5 pb-5 pt-1">
              {fin.costTotal === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-400">原価はまだ登録されていません</p>
              ) : (
                <>
                  {/* 積み上げバー（2pxギャップで区切る） */}
                  <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
                    {fin.orderTotal > 0 ? (
                      <span className="rounded-full bg-indigo-400" style={{ width: `${(fin.orderTotal / costBreakdownTotal) * 100}%` }} />
                    ) : null}
                    {fin.materialTotal > 0 ? (
                      <span className="rounded-full bg-amber-400" style={{ width: `${(fin.materialTotal / costBreakdownTotal) * 100}%` }} />
                    ) : null}
                    {fin.expenseTotal > 0 ? (
                      <span className="rounded-full bg-slate-300" style={{ width: `${(fin.expenseTotal / costBreakdownTotal) * 100}%` }} />
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      { label: "発注費", value: fin.orderTotal, dot: "bg-indigo-400", tab: "order" },
                      { label: "材料費", value: fin.materialTotal, dot: "bg-amber-400", tab: "material" },
                      { label: "その他経費", value: fin.expenseTotal, dot: "bg-slate-300", tab: "expense" },
                    ].map((row) => (
                      <button
                        key={row.label}
                        type="button"
                        onClick={() => setTab(row.tab)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-neutral-50 cursor-pointer"
                      >
                        <span className="flex items-center gap-2 text-xs text-neutral-500">
                          <span className={cn("h-2 w-2 rounded-[3px]", row.dot)} />
                          {row.label}
                        </span>
                        <CurrencyText value={row.value} className="text-xs" />
                      </button>
                    ))}
                    {fin.unpaidCost > 0 ? (
                      <p className="border-t border-neutral-100 pt-2 text-[11px] text-neutral-400 tnum">
                        うち未払い {yen(fin.unpaidCost)}
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </Card>

          <div className="space-y-3">
            <Card>
              <CardHeader
                title="メモ"
                action={
                  <button
                    type="button"
                    onClick={() => setTab("memo")}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer"
                  >
                    編集
                  </button>
                }
              />
              <div className="px-5 pb-4">
                <p className="whitespace-pre-wrap text-xs leading-6 text-neutral-600">
                  {project.memo || "メモはまだありません"}
                </p>
              </div>
            </Card>
            <Card>
              <CardHeader
                title="最近の書類"
                action={
                  <Link
                    href={`/app/documents/upload?project=${project.id}`}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    写真から登録
                  </Link>
                }
              />
              <div className="px-3 pb-3">
                {documents.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-neutral-400">書類はまだありません</p>
                ) : (
                  documents.slice(0, 4).map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setTab("documents")}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-neutral-50 cursor-pointer"
                    >
                      <DocThumb doc={doc} className="h-9 w-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-neutral-800">
                          {doc.vendorName || DOCUMENT_TYPES[doc.documentType]}
                        </p>
                        <p className="text-[10px] text-neutral-400 tnum">
                          {doc.totalAmount !== null ? yen(doc.totalAmount) : "金額未読取"}
                        </p>
                      </div>
                      <StatusBadge meta={DOCUMENT_STATUSES[doc.status]} />
                    </button>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "revenue" ? (
        <Card>
          <CardHeader
            title={`売上合計 ${yen(fin.revenueTotal)}`}
            description={`未請求 ${yen(fin.unbilled)}・未入金 ${yen(fin.unpaidReceivable)}`}
            action={
              <Button size="sm" onClick={() => setRevenueForm({ open: true, editing: null })}>
                <Plus className="h-3.5 w-3.5" />
                追加
              </Button>
            }
          />
          <div className="mt-2 px-2 pb-3">
            {revenues.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="売上はまだ登録されていません"
                description="契約金額や着手金・完工金を登録すると利益が自動計算されます。"
                action={
                  <Button size="sm" onClick={() => setRevenueForm({ open: true, editing: null })}>
                    <Plus className="h-3.5 w-3.5" />
                    最初の売上を登録
                  </Button>
                }
                className="py-8"
              />
            ) : (
              <div className="divide-y divide-neutral-50">
                {revenues.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-neutral-800">{r.title}</p>
                      <p className="text-[11px] text-neutral-400">
                        {r.status === "paid"
                          ? `入金日 ${formatDate(r.paidDate)}`
                          : r.status === "billed"
                            ? `請求日 ${formatDate(r.billedDate)}・入金予定 ${formatDate(r.paymentDueDate)}`
                            : `請求予定 ${formatDate(r.billingDueDate)}`}
                      </p>
                    </div>
                    <StatusBadge meta={REVENUE_STATUSES[r.status]} />
                    <CurrencyText value={r.amount} className="w-24 text-right text-[13px]" />
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={() => setRevenueForm({ open: true, editing: r })}
                        className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
                        aria-label="編集"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete({ kind: "revenue", id: r.id, label: r.title })}
                        className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        aria-label="削除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {tab === "order" ? costTab("order") : null}
      {tab === "material" ? costTab("material") : null}
      {tab === "expense" ? costTab("expense") : null}

      {tab === "documents" ? (
        <Card>
          <CardHeader
            title={`書類 ${documents.length}件`}
            action={
              <Link href={`/app/documents/upload?project=${project.id}`}>
                <Button size="sm">
                  <Camera className="h-3.5 w-3.5" />
                  写真から登録
                </Button>
              </Link>
            }
          />
          <div className="px-5 pb-5 pt-2">
            {documents.length === 0 ? (
              <EmptyState
                icon={Files}
                title="書類はまだありません"
                description="レシート・請求書・見積書を写真で撮ってアップロードすると、この案件に紐づけて保管されます。"
                className="py-8"
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {documents.map((doc) => (
                  <Link
                    key={doc.id}
                    href="/app/documents"
                    className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 transition-colors hover:border-neutral-200 hover:bg-neutral-50"
                  >
                    <DocThumb doc={doc} className="h-12 w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-neutral-800">
                        {doc.vendorName || DOCUMENT_TYPES[doc.documentType]}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {DOCUMENT_TYPES[doc.documentType]}・{shortDate(doc.documentDate)}
                        {doc.registeredTo
                          ? `・${
                              doc.registeredTo.kind === "revenue"
                                ? "売上"
                                : COST_TYPES[
                                    db.costs.find((c) => c.id === doc.registeredTo?.id)?.type ?? "expense"
                                  ].shortLabel
                            }に登録済`
                          : ""}
                      </p>
                      <p className="text-[11px] font-semibold text-neutral-700 tnum">
                        {doc.totalAmount !== null ? yen(doc.totalAmount) : "金額未読取"}
                      </p>
                    </div>
                    <StatusBadge meta={DOCUMENT_STATUSES[doc.status]} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {tab === "estimates" ? (
        <Card>
          <CardHeader
            title={`見積書 ${estimates.length}件`}
            action={
              <Link href={`/app/estimates/new?project=${project.id}`}>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  見積を作成
                </Button>
              </Link>
            }
          />
          <div className="mt-2 px-2 pb-3">
            {estimates.length === 0 ? (
              <EmptyState icon={FileSpreadsheet} title="見積書はまだありません" className="py-8" />
            ) : (
              <div className="divide-y divide-neutral-50">
                {estimates.map((e) => (
                  <Link
                    key={e.id}
                    href={`/app/estimates/${e.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-neutral-800">{e.title}</p>
                      <p className="text-[11px] text-neutral-400">
                        {e.estimateNumber}・{formatDate(e.issueDate)}
                      </p>
                    </div>
                    <StatusBadge meta={ESTIMATE_STATUSES[e.status]} />
                    <CurrencyText value={e.total} className="w-24 text-right text-[13px]" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {tab === "invoices" ? (
        <Card>
          <CardHeader
            title={`請求書 ${invoices.length}件`}
            action={
              <Link href={`/app/invoices/new?project=${project.id}`}>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  請求書を作成
                </Button>
              </Link>
            }
          />
          <div className="mt-2 px-2 pb-3">
            {invoices.length === 0 ? (
              <EmptyState icon={FileText} title="請求書はまだありません" className="py-8" />
            ) : (
              <div className="divide-y divide-neutral-50">
                {invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/app/invoices/${inv.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-neutral-800">{inv.title}</p>
                      <p className="text-[11px] text-neutral-400">
                        {inv.invoiceNumber}・支払期限 {formatDate(inv.dueDate)}
                      </p>
                    </div>
                    <StatusBadge meta={INVOICE_STATUSES[inv.status]} />
                    <CurrencyText value={inv.total} className="w-24 text-right text-[13px]" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {tab === "memo" ? (
        <Card>
          <CardHeader title="メモ" description="現場の注意点・打ち合わせ内容などを記録できます" />
          <div className="px-5 pb-5">
            <Textarea
              rows={8}
              value={memoDraft ?? project.memo}
              onChange={(e) => setMemoDraft(e.target.value)}
              placeholder="メモを入力…"
            />
            <div className="mt-3 flex justify-end">
              <Button
                disabled={memoDraft === null || memoDraft === project.memo}
                onClick={() => {
                  updateProject(project.id, { memo: memoDraft ?? "" });
                  setMemoDraft(null);
                  toast({ title: "メモを保存しました" });
                }}
              >
                保存する
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {/* ダイアログ群 */}
      <ProjectForm open={editOpen} onClose={() => setEditOpen(false)} project={project} />
      <RevenueForm
        open={revenueForm.open}
        onClose={() => setRevenueForm({ open: false, editing: null })}
        projectId={project.id}
        revenue={revenueForm.editing}
      />
      <CostForm
        open={costForm.open}
        onClose={() => setCostForm({ open: false, editing: null, type: costForm.type })}
        projectId={project.id}
        cost={costForm.editing}
        defaultType={costForm.type}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="案件を削除しますか？"
        description={`「${project.name}」と紐づく売上・原価データが削除されます。書類は「案件未割当」として残ります。この操作は取り消せません。`}
        onConfirm={() => {
          removeProject(project.id);
          toast({ title: "案件を削除しました" });
          router.push("/app/projects");
        }}
      />
      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={`「${confirmDelete?.label ?? ""}」を削除しますか？`}
        description="削除すると案件の収支に即時反映されます。この操作は取り消せません。"
        onConfirm={() => {
          if (!confirmDelete) return;
          if (confirmDelete.kind === "revenue") removeRevenue(confirmDelete.id);
          else removeCost(confirmDelete.id);
          toast({ title: "削除しました" });
        }}
      />
    </PageContainer>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectDetailContent />
    </Suspense>
  );
}
