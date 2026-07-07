"use client";

import {
  AlertTriangle,
  Camera,
  CircleAlert,
  ClipboardList,
  FileClock,
  FolderKanban,
  JapaneseYen,
  Percent,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { CurrencyText } from "@/components/shared/currency-text";
import { MonthlyChart } from "@/components/app/monthly-chart";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { ProfitBadge } from "@/components/app/profit-badge";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { DocThumb } from "@/components/app/doc-thumb";
import { Button } from "@/components/shared/button";
import { Card, CardHeader } from "@/components/shared/card";
import { PageSkeleton } from "@/components/shared/skeleton";
import { dashboardStats, invoiceIsOverdue, monthlySeries, projectFinance } from "@/lib/app/calc";
import { DOCUMENT_STATUSES, DOCUMENT_TYPES, INVOICE_STATUSES, OVERDUE_BADGE } from "@/lib/app/constants";
import { daysUntil, longDate, pct1, relativeDate, shortDate, yen } from "@/lib/shared/format";
import { useDB } from "@/lib/app/store";
import { cn } from "@/lib/shared/utils";

function Panel({
  title,
  moreHref,
  children,
  isEmpty,
  emptyText,
}: {
  title: string;
  moreHref: string;
  children: React.ReactNode;
  isEmpty: boolean;
  emptyText: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title={title}
        action={
          <Link href={moreHref} className="text-xs font-medium text-brand-600 hover:text-brand-700">
            すべて見る
          </Link>
        }
      />
      <div className="mt-2 flex-1 px-2 pb-3">
        {isEmpty ? (
          <p className="px-3 py-6 text-center text-xs text-neutral-400">{emptyText}</p>
        ) : (
          <div className="divide-y divide-neutral-50">{children}</div>
        )}
      </div>
    </Card>
  );
}

function PanelRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-neutral-50"
    >
      {children}
    </Link>
  );
}

export default function DashboardPage() {
  const db = useDB();

  if (!db.hydrated) return <PageSkeleton />;

  const stats = dashboardStats(db);
  const series = monthlySeries(db, 6);

  const lowProfitProjects = db.projects
    .filter((p) => p.status !== "lost")
    .map((p) => ({ project: p, fin: projectFinance(p.id, db) }))
    .filter(({ fin }) => fin.isDeficit || fin.isLowProfit)
    .sort((a, b) => (a.fin.profitRate ?? 0) - (b.fin.profitRate ?? 0))
    .slice(0, 5);

  const recentDocs = [...db.documents]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const pendingDocs = db.documents
    .filter((d) => d.status === "needs_review" || d.status === "attention" || d.status === "pending")
    .slice(0, 5);

  const unbilledRevenues = db.revenues
    .filter((r) => r.status === "unbilled")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const unpaidInvoices = db.invoices
    .filter((i) => i.status === "sent")
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .slice(0, 5);

  const upcomingProjects = db.projects
    .filter((p) => {
      if (p.status !== "in_progress" && p.status !== "ordered") return false;
      const d = daysUntil(p.dueDate);
      return d !== null && d <= 14;
    })
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 5);

  const projectById = (id: string | null) => db.projects.find((p) => p.id === id);

  return (
    <PageContainer>
      <AppPageHeader
        title="ダッシュボード"
        description={`${longDate(new Date().toISOString())}時点の経営状況`}
        actions={
          <>
            <Link href="/app/projects/new">
              <Button variant="secondary" size="md">
                <Plus className="h-4 w-4" />
                新規案件
              </Button>
            </Link>
            <Link href="/app/documents/upload">
              <Button size="md">
                <Camera className="h-4 w-4" />
                写真から登録
              </Button>
            </Link>
          </>
        }
      />

      {/* 今月の主要KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="今月の売上"
          value={yen(stats.monthRevenue)}
          icon={JapaneseYen}
          tone="brand"
          sub={`原価 ${yen(stats.monthCost)}`}
        />
        <StatCard
          label="今月の粗利益"
          value={yen(stats.monthProfit)}
          icon={TrendingUp}
          tone={stats.monthProfit < 0 ? "danger" : "success"}
          sub={
            stats.monthProfitRate !== null
              ? `利益率 ${pct1(stats.monthProfitRate)}`
              : "売上未計上"
          }
        />
        <StatCard
          label="未請求金額"
          value={yen(stats.totalUnbilled)}
          icon={FileClock}
          tone={stats.totalUnbilled > 0 ? "warning" : "default"}
          href="/app/revenues?filter=unbilled"
          sub="請求書の発行漏れに注意"
        />
        <StatCard
          label="未入金金額"
          value={yen(stats.totalUnpaidReceivable)}
          icon={Wallet}
          tone={stats.totalUnpaidReceivable > 0 ? "danger" : "default"}
          href="/app/revenues?filter=unpaid"
          sub="請求済みで入金待ちの金額"
        />
      </div>

      {/* 今月の内訳・件数 */}
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <StatCard size="sm" label="今月の原価" value={yen(stats.monthCost)} />
        <StatCard size="sm" label="今月の発注費" value={yen(stats.monthOrder)} />
        <StatCard size="sm" label="今月の材料費" value={yen(stats.monthMaterial)} />
        <StatCard size="sm" label="今月の経費" value={yen(stats.monthExpense)} />
        <StatCard
          size="sm"
          label="今月の利益率"
          value={stats.monthProfitRate !== null ? pct1(stats.monthProfitRate) : "—"}
          icon={Percent}
          tone={
            stats.monthProfitRate === null
              ? "default"
              : stats.monthProfitRate < 0
                ? "danger"
                : stats.monthProfitRate < 20
                  ? "warning"
                  : "success"
          }
        />
        <StatCard
          size="sm"
          label="未確認書類"
          value={`${stats.unconfirmedDocCount}件`}
          icon={ClipboardList}
          tone={stats.unconfirmedDocCount > 0 ? "warning" : "default"}
          href="/app/documents?filter=pending"
          className="col-span-1"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          size="sm"
          label="進行中案件"
          value={`${stats.activeProjectCount}件`}
          icon={FolderKanban}
          href="/app/projects?status=in_progress"
        />
        <StatCard
          size="sm"
          label="完了案件"
          value={`${stats.completedProjectCount}件`}
          href="/app/projects?status=completed"
        />
        <StatCard
          size="sm"
          label="赤字案件"
          value={`${stats.deficitProjectCount}件`}
          icon={CircleAlert}
          tone={stats.deficitProjectCount > 0 ? "danger" : "default"}
          href="/app/projects?filter=deficit"
        />
        <StatCard
          size="sm"
          label="利益率20%未満"
          value={`${stats.lowProfitProjectCount}件`}
          icon={AlertTriangle}
          tone={stats.lowProfitProjectCount > 0 ? "warning" : "default"}
          href="/app/projects?filter=low_profit"
        />
      </div>

      {/* 月次推移 + 完了予定 */}
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="月次推移" description="売上と原価の6ヶ月推移（計上月ベース）" />
          <div className="px-5 pb-5 pt-3">
            <MonthlyChart data={series} />
          </div>
        </Card>
        <Panel
          title="完了予定日が近い案件"
          moreHref="/app/calendar"
          isEmpty={upcomingProjects.length === 0}
          emptyText="14日以内に完了予定の案件はありません"
        >
          {upcomingProjects.map((p) => {
            const overdue = (daysUntil(p.dueDate) ?? 0) < 0;
            return (
              <PanelRow key={p.id} href={`/app/projects/${p.id}`}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-neutral-800">{p.name}</p>
                  <p className="text-[11px] text-neutral-400">{p.customerName}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                    overdue ? "bg-red-50 text-red-600" : "bg-neutral-100 text-neutral-500"
                  )}
                >
                  {overdue ? "期日超過" : relativeDate(p.dueDate)}
                </span>
              </PanelRow>
            );
          })}
        </Panel>
      </div>

      {/* 下部パネル */}
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Panel
          title="利益率が低い案件"
          moreHref="/app/projects?filter=low_profit"
          isEmpty={lowProfitProjects.length === 0}
          emptyText="利益率が低い案件はありません"
        >
          {lowProfitProjects.map(({ project, fin }) => (
            <PanelRow key={project.id} href={`/app/projects/${project.id}`}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: project.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-neutral-800">{project.name}</p>
                <p className="text-[11px] text-neutral-400 tnum">粗利 {yen(fin.profit)}</p>
              </div>
              <ProfitBadge fin={fin} />
            </PanelRow>
          ))}
        </Panel>

        <Panel
          title="未処理のレシート・書類"
          moreHref="/app/documents?filter=pending"
          isEmpty={pendingDocs.length === 0}
          emptyText="確認待ちの書類はありません"
        >
          {pendingDocs.map((doc) => (
            <PanelRow key={doc.id} href="/app/documents">
              <DocThumb doc={doc} className="h-10 w-9 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-neutral-800">
                  {doc.vendorName || DOCUMENT_TYPES[doc.documentType]}
                </p>
                <p className="text-[11px] text-neutral-400 tnum">
                  {doc.totalAmount !== null ? yen(doc.totalAmount) : "金額未読取"}
                </p>
              </div>
              <StatusBadge meta={DOCUMENT_STATUSES[doc.status]} />
            </PanelRow>
          ))}
        </Panel>

        <Panel
          title="未請求の案件"
          moreHref="/app/revenues?filter=unbilled"
          isEmpty={unbilledRevenues.length === 0}
          emptyText="未請求の売上はありません"
        >
          {unbilledRevenues.map((r) => {
            const project = projectById(r.projectId);
            return (
              <PanelRow key={r.id} href={`/app/projects/${r.projectId}?tab=revenue`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-neutral-800">
                    {project?.name ?? "—"}
                  </p>
                  <p className="truncate text-[11px] text-neutral-400">{r.title}</p>
                </div>
                <CurrencyText value={r.amount} className="text-xs" />
              </PanelRow>
            );
          })}
        </Panel>

        <Panel
          title="未入金の請求書"
          moreHref="/app/invoices"
          isEmpty={unpaidInvoices.length === 0}
          emptyText="入金待ちの請求書はありません"
        >
          {unpaidInvoices.map((inv) => {
            const overdue = invoiceIsOverdue(inv);
            return (
              <PanelRow key={inv.id} href={`/app/invoices/${inv.id}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-neutral-800">
                    {inv.customerName} 様
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    期限 {shortDate(inv.dueDate)}・{inv.invoiceNumber}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <CurrencyText value={inv.total} className="text-xs" />
                  <StatusBadge
                    meta={
                      overdue
                        ? { label: "期限超過", badge: OVERDUE_BADGE, dot: "bg-red-500" }
                        : INVOICE_STATUSES[inv.status]
                    }
                  />
                </div>
              </PanelRow>
            );
          })}
        </Panel>

        <Panel
          title="最近アップロードされた書類"
          moreHref="/app/documents"
          isEmpty={recentDocs.length === 0}
          emptyText="書類はまだありません"
        >
          {recentDocs.map((doc) => {
            const project = projectById(doc.projectId);
            return (
              <PanelRow key={doc.id} href="/app/documents">
                <DocThumb doc={doc} className="h-10 w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-neutral-800">
                    {doc.vendorName || DOCUMENT_TYPES[doc.documentType]}
                  </p>
                  <p className="truncate text-[11px] text-neutral-400">
                    {project?.name ?? "案件未割当"}
                  </p>
                </div>
                <span className="text-[11px] text-neutral-400">{shortDate(doc.createdAt)}</span>
              </PanelRow>
            );
          })}
        </Panel>

        <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Camera className="h-6 w-6 text-brand-600" />
          </span>
          <div>
            <p className="text-sm font-bold text-neutral-800">レシートを撮るだけで経費登録</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              現場のレシート・請求書を写真でアップロードすると、
              AIが金額・日付・取引先を読み取って案件に振り分けます。
            </p>
          </div>
          <Link href="/app/documents/upload">
            <Button size="md">
              <Camera className="h-4 w-4" />
              写真から登録する
            </Button>
          </Link>
        </Card>
      </div>
    </PageContainer>
  );
}
