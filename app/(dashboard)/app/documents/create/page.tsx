"use client";

import { ChevronRight, FileInput, FileSpreadsheet, FileText, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { CurrencyText } from "@/components/shared/currency-text";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSkeleton } from "@/components/shared/skeleton";
import {
  ESTIMATE_STATUSES,
  INVOICE_STATUSES,
} from "@/lib/app/constants";
import { useDB, useSession } from "@/lib/app/data-store";
import { canEditData } from "@/lib/app/permissions";
import { formatDate } from "@/lib/shared/format";

// ============================================================
// 書類作成（見積書・請求書・発注書の入口）
// 現場ユーザーが迷わないよう、大きな3枚のカードから始める
// ============================================================

const CARDS = [
  {
    href: "/app/documents/create/estimate",
    label: "見積書を作る",
    description: "お客様に出す見積書",
    icon: FileSpreadsheet,
    tint: "bg-violet-50 text-violet-600",
  },
  {
    href: "/app/documents/create/invoice",
    label: "請求書を作る",
    description: "お客様に出す請求書",
    icon: FileText,
    tint: "bg-blue-50 text-blue-600",
  },
  {
    href: "/app/documents/create/purchase-order",
    label: "発注書を作る",
    description: "外注先・協力会社に出す発注書",
    icon: FileInput,
    tint: "bg-indigo-50 text-indigo-600",
  },
];

export default function DocumentCreatePage() {
  const db = useDB();
  const session = useSession();

  if (!db.hydrated) return <PageSkeleton />;

  if (!canEditData(session?.role)) {
    return (
      <PageContainer className="max-w-3xl">
        <AppPageHeader title="書類作成" />
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-card">
          <EmptyState
            icon={ShieldAlert}
            title="書類作成の権限がありません"
            description="閲覧のみの権限のため、書類の作成はできません。"
          />
        </div>
      </PageContainer>
    );
  }

  // 最近作成した書類（見積・請求・発注をまとめて新しい順に）
  const recent = [
    ...db.estimates.map((e) => ({
      key: `e-${e.id}`,
      href: `/app/estimates/${e.id}`,
      kind: "見積書",
      number: e.estimateNumber,
      title: e.title,
      total: e.total,
      createdAt: e.createdAt,
      badge: ESTIMATE_STATUSES[e.status],
    })),
    ...db.invoices.map((i) => ({
      key: `i-${i.id}`,
      href: `/app/invoices/${i.id}`,
      kind: "請求書",
      number: i.invoiceNumber,
      title: i.title,
      total: i.total,
      createdAt: i.createdAt,
      badge: INVOICE_STATUSES[i.status],
    })),
    ...db.purchaseOrders.map((p) => ({
      key: `p-${p.id}`,
      href: `/app/purchase-orders/${p.id}`,
      kind: "発注書",
      number: p.orderNumber,
      title: p.title,
      total: p.total,
      createdAt: p.createdAt,
      badge:
        p.status === "sent"
          ? { label: "発注済", badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" }
          : { label: "下書き", badge: "bg-neutral-100 text-neutral-600 border-neutral-200", dot: "bg-neutral-400" },
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  return (
    <PageContainer className="max-w-3xl">
      <AppPageHeader
        title="書類作成"
        description="見積書・請求書・発注書をかんたんに作成できます"
      />

      {/* 3つの大きな入口 */}
      <div className="grid gap-3 sm:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white p-6 text-center shadow-card transition-all hover:border-brand-300 hover:shadow-pop sm:p-8"
          >
            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.tint}`}>
              <card.icon className="h-7 w-7" />
            </span>
            <div>
              <p className="text-[15px] font-bold text-neutral-900">{card.label}</p>
              <p className="mt-1 text-[11px] text-neutral-400">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* 最近作成した書類 */}
      {recent.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 px-1 text-xs font-bold text-neutral-500">最近作成した書類</p>
          <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-card">
            <div className="divide-y divide-neutral-100">
              {recent.map((doc) => (
                <Link
                  key={doc.key}
                  href={doc.href}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50"
                >
                  <span className="w-12 shrink-0 text-[11px] font-bold text-neutral-500">
                    {doc.kind}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-neutral-800">{doc.title}</p>
                    <p className="text-[11px] text-neutral-400">
                      {doc.number}・{formatDate(doc.createdAt)}
                    </p>
                  </div>
                  <StatusBadge meta={doc.badge} />
                  <CurrencyText value={doc.total} className="w-24 text-right text-[13px]" />
                  <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
