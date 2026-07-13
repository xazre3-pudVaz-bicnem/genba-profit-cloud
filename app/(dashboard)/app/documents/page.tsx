"use client";

import { Camera, ExternalLink, FileSearch, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { DocThumb } from "@/components/app/doc-thumb";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/shared/button";
import { ConfirmDialog, Dialog } from "@/components/shared/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/shared/input";
import { Field } from "@/components/shared/label";
import { Select } from "@/components/shared/select";
import { PageSkeleton } from "@/components/shared/skeleton";
import { FilterChips } from "@/components/shared/tabs";
import { toast } from "@/components/shared/toast";
import {
  COST_TYPES,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  EXPENSE_CATEGORIES,
} from "@/lib/app/constants";
import { calcTax, formatDate, shortDate, yen } from "@/lib/shared/format";
import {
  addCost,
  addRevenue,
  getDocumentSignedUrl,
  removeDocument,
  updateDocument,
  useDB,
} from "@/lib/app/data-store";
import type {
  DocumentRec,
  DocumentStatus,
  DocumentType,
  ExpenseCategory,
  RegisterTarget,
} from "@/lib/app/types";

type StatusFilter = DocumentStatus | "all" | "unassigned" | "pending";

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "pending", label: "要対応" },
  { value: "needs_review", label: "確認待ち" },
  { value: "attention", label: "要確認" },
  { value: "registered", label: "登録済み" },
  { value: "analyzed", label: "解析済み" },
  { value: "unassigned", label: "案件未割当" },
];

const TARGET_LABELS: Record<Exclude<RegisterTarget, "none">, string> = {
  material: "材料費",
  order: "外注費",
  expense: "経費",
  revenue: "売上",
};

function DocumentsContent() {
  const db = useDB();
  const params = useSearchParams();

  const [status, setStatus] = useState<StatusFilter>(
    (params.get("filter") as StatusFilter) || "all"
  );
  const [type, setType] = useState<DocumentType | "all">("all");
  const [projectId, setProjectId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<DocumentRec | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRec | null>(null);

  // 詳細ダイアログ内の登録フォーム
  const [registerTarget, setRegisterTarget] = useState<Exclude<RegisterTarget, "none">>("material");
  const [registerCategory, setRegisterCategory] = useState<ExpenseCategory>("site_misc");

  const docs = useMemo(() => {
    let list = [...db.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    switch (status) {
      case "all":
        break;
      case "unassigned":
        list = list.filter((d) => d.projectId === null);
        break;
      case "pending":
        list = list.filter(
          (d) => d.status === "needs_review" || d.status === "attention" || d.status === "pending"
        );
        break;
      default:
        list = list.filter((d) => d.status === status);
    }
    if (type !== "all") list = list.filter((d) => d.documentType === type);
    if (projectId !== "all") {
      list = list.filter((d) =>
        projectId === "none" ? d.projectId === null : d.projectId === projectId
      );
    }
    if (from) list = list.filter((d) => (d.documentDate ?? d.createdAt.slice(0, 10)) >= from);
    if (to) list = list.filter((d) => (d.documentDate ?? d.createdAt.slice(0, 10)) <= to);
    return list;
  }, [db.documents, status, type, projectId, from, to]);

  if (!db.hydrated) return <PageSkeleton />;

  const projectOf = (id: string | null) => db.projects.find((p) => p.id === id);

  /** 登録先ラベル（売上 / 外注費 / 材料費 / 経費） */
  const registeredLabel = (doc: DocumentRec): string | null => {
    if (!doc.registeredTo) return null;
    if (doc.registeredTo.kind === "revenue") return "売上";
    const cost = db.costs.find((c) => c.id === doc.registeredTo?.id);
    return cost ? COST_TYPES[cost.type].shortLabel : "原価";
  };

  // 最新の状態を参照する（ダイアログ表示中の更新に追従）
  const current = selected ? db.documents.find((d) => d.id === selected.id) ?? null : null;

  const registerNow = () => {
    if (!current || !current.projectId) return;
    const amount = current.totalAmount ?? 0;
    if (amount <= 0) {
      toast({ title: "金額が未読取のため登録できません", description: "書類を開いて金額を入力してください", variant: "error" });
      return;
    }
    const tax = current.taxAmount ?? calcTax(amount, "inclusive").tax;
    const title = current.ai?.items.map((i) => i.name).join("、") ?? "";

    if (registerTarget === "revenue") {
      const rev = addRevenue({
        projectId: current.projectId,
        title: title || DOCUMENT_TYPES[current.documentType],
        amount,
        taxType: "inclusive",
        taxAmount: tax,
        billingDueDate: current.documentDate,
        billedDate: null,
        paymentDueDate: null,
        paidDate: null,
        status: "unbilled",
        memo: `書類から登録（${current.vendorName}）`,
        documentId: current.id,
      });
      updateDocument(current.id, { registeredTo: { kind: "revenue", id: rev.id }, status: "registered" });
    } else {
      const cost = addCost({
        projectId: current.projectId,
        type: registerTarget,
        vendorName: current.vendorName,
        title,
        category: registerTarget === "expense" ? registerCategory : null,
        amount,
        taxType: "inclusive",
        taxAmount: tax,
        paymentMethod: current.ai?.paymentMethod ?? null,
        purchaseDate: current.documentDate,
        paymentDueDate: null,
        paidDate: current.documentDate,
        status: "paid",
        memo: "書類一覧から登録",
        documentId: current.id,
      });
      updateDocument(current.id, { registeredTo: { kind: "cost", id: cost.id }, status: "registered" });
    }
    toast({ title: `${TARGET_LABELS[registerTarget]}として登録しました`, description: "案件の収支に反映しました" });
  };

  return (
    <PageContainer>
      <AppPageHeader
        title="書類"
        description="アップロードしたレシート・請求書・見積書を一元管理"
        actions={
          <Link href="/app/documents/upload">
            <Button>
              <Camera className="h-4 w-4" />
              写真から登録
            </Button>
          </Link>
        }
      />

      <div className="mb-4 space-y-3">
        <FilterChips
          items={STATUS_CHIPS.map((c) => ({
            ...c,
            count:
              c.value === "all"
                ? db.documents.length
                : c.value === "unassigned"
                  ? db.documents.filter((d) => d.projectId === null).length
                  : c.value === "pending"
                    ? db.documents.filter(
                        (d) =>
                          d.status === "needs_review" ||
                          d.status === "attention" ||
                          d.status === "pending"
                      ).length
                    : db.documents.filter((d) => d.status === c.value).length,
          }))}
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={type} onChange={(e) => setType(e.target.value as DocumentType | "all")} className="w-40">
            <option value="all">種別: すべて</option>
            {(Object.keys(DOCUMENT_TYPES) as DocumentType[]).map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPES[t]}
              </option>
            ))}
          </Select>
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-52">
            <option value="all">案件: すべて</option>
            <option value="none">案件未割当</option>
            {db.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-1.5">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 w-[140px] text-xs" />
            <span className="text-xs text-neutral-400">〜</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 w-[140px] text-xs" />
          </div>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-card">
          <EmptyState
            icon={FileSearch}
            title="書類がありません"
            description="レシートや請求書を写真で撮ってアップロードすると、ここに保管されます。"
            action={
              <Link href="/app/documents/upload">
                <Button>
                  <Camera className="h-4 w-4" />
                  写真から登録
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {docs.map((doc) => {
            const project = projectOf(doc.projectId);
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  setSelected(doc);
                  setRegisterTarget(
                    doc.documentType === "invoice" ? "order" : doc.documentType === "receipt" ? "material" : "expense"
                  );
                }}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white p-3.5 text-left shadow-card transition-all hover:border-neutral-300 hover:shadow-pop cursor-pointer"
              >
                <DocThumb doc={doc} className="h-16 w-[52px] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-bold text-neutral-900">
                      {doc.vendorName || DOCUMENT_TYPES[doc.documentType]}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    {DOCUMENT_TYPES[doc.documentType]}・{shortDate(doc.documentDate)}・{doc.uploadedBy}
                  </p>
                  <p className="tnum mt-1 text-sm font-bold text-neutral-800">
                    {doc.totalAmount !== null ? yen(doc.totalAmount) : "金額未読取"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge meta={DOCUMENT_STATUSES[doc.status]} />
                    {registeredLabel(doc) ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        {registeredLabel(doc)}に登録
                      </span>
                    ) : null}
                    {project ? (
                      <span className="inline-flex max-w-[160px] items-center gap-1 truncate rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: project.color }} />
                        <span className="truncate">{project.name}</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-400">
                        案件未割当
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 書類詳細ダイアログ */}
      <Dialog
        open={current !== null}
        onClose={() => setSelected(null)}
        title={current?.vendorName || (current ? DOCUMENT_TYPES[current.documentType] : "")}
        description={current ? `${DOCUMENT_TYPES[current.documentType]}・アップロード: ${formatDate(current.createdAt)}（${current.uploadedBy}）` : undefined}
        size="lg"
        footer={
          current ? (
            <>
              <Button
                variant="ghost"
                className="mr-auto text-red-600 hover:bg-red-50"
                onClick={() => setDeleteTarget(current)}
              >
                <Trash2 className="h-4 w-4" />
                削除
              </Button>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                閉じる
              </Button>
            </>
          ) : undefined
        }
      >
        {current ? (
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <div className="space-y-2">
              <DocThumb doc={current} className="h-44 w-full sm:h-48" />
              {current.fileUrl ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    const url = await getDocumentSignedUrl(current.fileUrl);
                    if (url) window.open(url, "_blank", "noopener");
                    else toast({ title: "原本を開けませんでした", description: "時間をおいて再度お試しください", variant: "error" });
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  原本を開く
                </Button>
              ) : null}
            </div>
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-3.5">
                <div>
                  <p className="text-[10px] text-neutral-400">合計金額</p>
                  <p className="tnum text-base font-bold text-neutral-900">
                    {current.totalAmount !== null ? yen(current.totalAmount) : "未読取"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400">うち消費税</p>
                  <p className="tnum text-base font-bold text-neutral-900">
                    {current.taxAmount !== null ? yen(current.taxAmount) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400">書類の日付</p>
                  <p className="text-xs font-semibold text-neutral-800">{formatDate(current.documentDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400">ステータス</p>
                  <StatusBadge meta={DOCUMENT_STATUSES[current.status]} />
                </div>
              </div>

              {current.ocrText ? (
                <div>
                  <p className="mb-1 text-[10px] font-bold text-neutral-400">読み取りテキスト</p>
                  <p className="whitespace-pre-wrap rounded-lg border border-neutral-100 bg-white p-2.5 text-[11px] leading-5 text-neutral-500">
                    {current.ocrText}
                  </p>
                </div>
              ) : null}

              <Field label="紐づく案件">
                <Select
                  value={current.projectId ?? ""}
                  onChange={(e) => {
                    updateDocument(current.id, {
                      projectId: e.target.value || null,
                      status:
                        current.status === "attention" || current.status === "needs_review"
                          ? e.target.value
                            ? "needs_review"
                            : "attention"
                          : current.status,
                    });
                    toast({ title: e.target.value ? "案件を変更しました" : "案件未割当にしました" });
                  }}
                >
                  <option value="">案件未割当</option>
                  {db.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {current.registeredTo ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700">
                  この書類は収支に登録済みです（{registeredLabel(current) ?? "原価"}）
                </p>
              ) : current.projectId ? (
                <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3.5">
                  <p className="mb-2 text-xs font-bold text-neutral-800">この内容で収支に登録する</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={registerTarget}
                      onChange={(e) => setRegisterTarget(e.target.value as Exclude<RegisterTarget, "none">)}
                      className="w-32"
                    >
                      {(Object.keys(TARGET_LABELS) as Exclude<RegisterTarget, "none">[]).map((t) => (
                        <option key={t} value={t}>
                          {TARGET_LABELS[t]}
                        </option>
                      ))}
                    </Select>
                    {registerTarget === "expense" ? (
                      <Select
                        value={registerCategory}
                        onChange={(e) => setRegisterCategory(e.target.value as ExpenseCategory)}
                        className="w-36"
                      >
                        {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((c) => (
                          <option key={c} value={c}>
                            {EXPENSE_CATEGORIES[c]}
                          </option>
                        ))}
                      </Select>
                    ) : null}
                    <Button size="sm" onClick={registerNow}>
                      登録して反映
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
                  案件を選択すると収支に登録できます
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="書類を削除しますか？"
        description="登録済みの収支データからも書類との紐づけが解除されます。この操作は取り消せません。"
        onConfirm={() => {
          if (deleteTarget) {
            removeDocument(deleteTarget.id);
            setSelected(null);
            toast({ title: "書類を削除しました" });
          }
        }}
      />
    </PageContainer>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DocumentsContent />
    </Suspense>
  );
}
