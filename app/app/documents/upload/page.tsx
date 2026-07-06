"use client";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImagePlus,
  Info,
  ScanLine,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";
import { ProfitBadge } from "@/components/app/profit-badge";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { ProjectSelector } from "@/components/app/project-selector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { PageSkeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { suggestProjects } from "@/lib/assign";
import { projectFinance } from "@/lib/calc";
import {
  DOCUMENT_TYPES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from "@/lib/constants";
import { calcTax, pct1, todayISO, yen } from "@/lib/format";
import { analyzeDocument, makeThumbnail, resizeForUpload, type AnalyzeOutcome } from "@/lib/ocr";
import {
  addCost,
  addDocument,
  addRevenue,
  getDB,
  updateDocument,
  useDB,
  useSession,
} from "@/lib/store";
import { uploadDocumentImage } from "@/lib/supabase/client";
import type {
  DocumentType,
  ExpenseCategory,
  PaymentMethod,
  RegisterTarget,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "pick" | "type" | "analyzing" | "confirm" | "done";

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "pick", label: "撮影" },
  { key: "type", label: "種別" },
  { key: "analyzing", label: "AI読取" },
  { key: "confirm", label: "確認" },
  { key: "done", label: "完了" },
];

const DEFAULT_TARGET: Record<DocumentType, RegisterTarget> = {
  receipt: "material",
  receipt_official: "expense",
  invoice: "order",
  estimate: "none",
  purchase_order: "order",
  delivery_note: "none",
  other: "expense",
};

const TARGET_LABELS: Record<RegisterTarget, string> = {
  material: "材料費として登録",
  order: "発注費として登録",
  expense: "経費として登録",
  revenue: "売上として登録",
  none: "書類のみ保管",
};

interface ConfirmForm {
  docType: DocumentType;
  vendor: string;
  date: string;
  amount: number;
  itemsText: string;
  paymentMethod: PaymentMethod | "";
  target: RegisterTarget;
  category: ExpenseCategory;
}

interface DoneInfo {
  projectId: string | null;
  projectName: string | null;
  target: RegisterTarget;
  amount: number;
}

function UploadContent() {
  const db = useDB();
  const session = useSession();
  const searchParams = useSearchParams();
  const contextProjectId = searchParams.get("project");

  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocumentType>("receipt");
  const [outcome, setOutcome] = useState<AnalyzeOutcome | null>(null);
  const [form, setForm] = useState<ConfirmForm | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(contextProjectId);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<DoneInfo | null>(null);
  const thumbRef = useRef<string | null>(null);

  const candidates = useMemo(
    () =>
      suggestProjects(
        { ocr: outcome?.result ?? null, contextProjectId },
        db
      ),
    [outcome, contextProjectId, db]
  );

  if (!db.hydrated) return <PageSkeleton />;

  const stepIndex = STEP_LABELS.findIndex((s) => s.key === step);

  const handleFile = (f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "画像ファイルを選択してください", variant: "error" });
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStep("type");
  };

  const startAnalyze = async () => {
    if (!file) return;
    setStep("analyzing");
    const [thumb, result] = await Promise.all([
      makeThumbnail(file),
      analyzeDocument(file, docType),
      new Promise((r) => setTimeout(r, 1100)),
    ]).then(([t, r]) => [t, r] as const);

    thumbRef.current = thumb;
    setOutcome(result);
    const r = result.result;
    setForm({
      docType: r.documentType || docType,
      vendor: r.vendorName,
      date: r.documentDate || todayISO(),
      amount: r.totalAmount,
      itemsText: r.items.map((i) => i.name).join("、"),
      paymentMethod: r.paymentMethod ?? "",
      target: DEFAULT_TARGET[r.documentType || docType],
      category: "site_misc",
    });
    // AI候補の最上位を初期選択（コンテキスト案件があればそちら優先）
    setSelectedProject((prev) => prev ?? null);
    setStep("confirm");
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);

    const tax = outcome?.result.taxAmount
      ? Math.min(outcome.result.taxAmount, form.amount)
      : calcTax(form.amount, "inclusive").tax;

    // Supabase設定時はStorageへアップロード（未設定ならスキップ）
    let fileUrl: string | null = null;
    if (file) {
      try {
        const resized = await resizeForUpload(file);
        fileUrl = await uploadDocumentImage(resized.dataUrl, file.name);
      } catch {
        fileUrl = null;
      }
    }

    const effectiveTarget: RegisterTarget = selectedProject ? form.target : "none";
    const topCandidate = candidates[0];
    const confidence =
      selectedProject && topCandidate?.project.id === selectedProject
        ? topCandidate.confidence
        : selectedProject
          ? "medium"
          : null;

    const doc = addDocument({
      projectId: selectedProject,
      uploadedBy: session?.name ?? "自分",
      documentType: form.docType,
      fileUrl,
      thumbnailUrl: thumbRef.current,
      vendorName: form.vendor,
      documentDate: form.date || null,
      totalAmount: form.amount,
      taxAmount: tax,
      ocrText: outcome?.result.rawText ?? "",
      ai: outcome?.result ?? null,
      assignmentConfidence: confidence,
      status: selectedProject ? (effectiveTarget === "none" ? "analyzed" : "registered") : "needs_review",
      registeredTo: null,
    });

    if (selectedProject && effectiveTarget !== "none") {
      if (effectiveTarget === "revenue") {
        const rev = addRevenue({
          projectId: selectedProject,
          title: form.itemsText || DOCUMENT_TYPES[form.docType],
          amount: form.amount,
          taxType: "inclusive",
          taxAmount: tax,
          billingDueDate: form.date || null,
          billedDate: null,
          paymentDueDate: null,
          paidDate: null,
          status: "unbilled",
          memo: `書類から登録（${form.vendor}）`,
          documentId: doc.id,
        });
        updateDocument(doc.id, { registeredTo: { kind: "revenue", id: rev.id }, status: "registered" });
      } else {
        const cost = addCost({
          projectId: selectedProject,
          type: effectiveTarget,
          vendorName: form.vendor,
          title: form.itemsText,
          category: effectiveTarget === "expense" ? form.category : null,
          amount: form.amount,
          taxType: "inclusive",
          taxAmount: tax,
          paymentMethod: form.paymentMethod || null,
          purchaseDate: form.date || null,
          paymentDueDate: null,
          paidDate: form.paymentMethod === "invoice" ? null : form.date || null,
          status: form.paymentMethod === "invoice" ? "unpaid" : "paid",
          memo: "写真から登録",
          documentId: doc.id,
        });
        updateDocument(doc.id, { registeredTo: { kind: "cost", id: cost.id }, status: "registered" });
      }
    }

    const project = selectedProject ? getDB().projects.find((p) => p.id === selectedProject) : null;
    setDone({
      projectId: selectedProject,
      projectName: project?.name ?? null,
      target: effectiveTarget,
      amount: form.amount,
    });
    setSaving(false);
    setStep("done");
    toast({
      title: "書類を保存しました",
      description:
        selectedProject && effectiveTarget !== "none"
          ? "案件の収支に反映しました"
          : undefined,
    });
  };

  const reset = () => {
    setStep("pick");
    setFile(null);
    setPreviewUrl(null);
    setOutcome(null);
    setForm(null);
    setSelectedProject(contextProjectId);
    setDone(null);
    thumbRef.current = null;
  };

  const doneFin = done?.projectId ? projectFinance(done.projectId, db) : null;

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        title="写真から登録"
        description="レシート・請求書を撮影するだけで、AIが内容を読み取り案件に振り分けます"
        backHref="/app/documents"
        backLabel="書類一覧"
      />

      {/* ステップ表示 */}
      <div className="mb-5 flex items-center gap-1">
        {STEP_LABELS.map((s, i) => (
          <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "h-1 w-full rounded-full",
                i <= stepIndex ? "bg-brand-500" : "bg-neutral-200"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium",
                i <= stepIndex ? "text-brand-700" : "text-neutral-400"
              )}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {step === "pick" ? (
        <Card className="p-5 sm:p-8">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className="flex flex-col items-center gap-5 rounded-2xl border-2 border-dashed border-neutral-200 px-4 py-10 text-center"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50">
              <Camera className="h-8 w-8 text-brand-600" />
            </span>
            <div>
              <p className="text-base font-bold text-neutral-900">レシートを撮影してください</p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                レシート・領収書・請求書・見積書に対応しています。
                <br className="hidden sm:block" />
                明るい場所で、全体が写るように撮影するときれいに読み取れます。
              </p>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-2.5">
              <label className="w-full cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <span className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-700">
                  <Camera className="h-5 w-5" />
                  カメラで撮影
                </span>
              </label>
              <label className="w-full cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <span className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white text-base font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50">
                  <ImagePlus className="h-5 w-5" />
                  写真を選択
                </span>
              </label>
            </div>
            <p className="text-[11px] text-neutral-400">PCの場合はここに画像をドラッグ&ドロップ</p>
          </div>
        </Card>
      ) : null}

      {step === "type" && previewUrl ? (
        <Card className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="アップロードした書類"
              className="max-h-64 w-full rounded-xl border border-neutral-200 object-contain sm:w-56"
            />
            <div className="flex-1">
              <p className="text-sm font-bold text-neutral-900">書類の種別を選択してください</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(DOCUMENT_TYPES) as DocumentType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDocType(t)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-xs font-semibold transition-all cursor-pointer",
                      docType === t
                        ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                    )}
                  >
                    {DOCUMENT_TYPES[t]}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex justify-between">
                <Button variant="ghost" onClick={reset}>
                  <ArrowLeft className="h-4 w-4" />
                  撮り直す
                </Button>
                <Button onClick={startAnalyze}>
                  AIで読み取る
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {step === "analyzing" ? (
        <Card className="flex flex-col items-center gap-4 p-12 text-center">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50">
            <ScanLine className="h-8 w-8 animate-pulse text-brand-600" />
          </span>
          <div>
            <p className="text-sm font-bold text-neutral-900">AIが書類を読み取っています…</p>
            <p className="mt-1 text-xs text-neutral-500">金額・日付・取引先を自動で抽出します</p>
          </div>
          <div className="h-1 w-48 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full w-1/2 animate-[analyzing_1.2s_ease-in-out_infinite] rounded-full bg-brand-500" />
          </div>
          <style>{`@keyframes analyzing { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`}</style>
        </Card>
      ) : null}

      {step === "confirm" && form ? (
        <div className="space-y-3">
          {outcome?.notice ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              <p className="text-xs leading-5 text-sky-800">{outcome.notice}</p>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-xs leading-5 text-emerald-800">
                AIが読み取った内容です。金額・案件を確認して保存してください。
              </p>
            </div>
          )}

          <Card className="p-5">
            <div className="flex gap-4">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="hidden h-40 w-32 rounded-xl border border-neutral-200 object-cover sm:block"
                />
              ) : null}
              <div className="grid flex-1 gap-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="書類種別">
                    <Select
                      value={form.docType}
                      onChange={(e) => setForm({ ...form, docType: e.target.value as DocumentType })}
                    >
                      {(Object.keys(DOCUMENT_TYPES) as DocumentType[]).map((t) => (
                        <option key={t} value={t}>
                          {DOCUMENT_TYPES[t]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="日付">
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="取引先">
                  <Input
                    value={form.vendor}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    placeholder="店名・会社名"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="合計金額（税込）" required>
                    <MoneyInput
                      value={form.amount}
                      onChange={(v) => setForm({ ...form, amount: v })}
                    />
                  </Field>
                  <Field label="支払方法">
                    <Select
                      value={form.paymentMethod}
                      onChange={(e) =>
                        setForm({ ...form, paymentMethod: e.target.value as PaymentMethod | "" })
                      }
                    >
                      <option value="">未設定</option>
                      {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((m) => (
                        <option key={m} value={m}>
                          {PAYMENT_METHODS[m]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="品目・内容">
                  <Input
                    value={form.itemsText}
                    onChange={(e) => setForm({ ...form, itemsText: e.target.value })}
                    placeholder="例：塗料・シーリング材"
                  />
                </Field>
                {outcome?.result.registrationNumber ? (
                  <p className="text-[11px] text-neutral-400">
                    インボイス登録番号: {outcome.result.registrationNumber}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <p className="mb-3 text-sm font-bold text-neutral-900">どの案件に登録しますか？</p>
            <ProjectSelector
              candidates={candidates}
              projects={db.projects}
              value={selectedProject}
              onChange={setSelectedProject}
            />
          </Card>

          <Card className="p-5">
            <p className="mb-3 text-sm font-bold text-neutral-900">登録先</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                value={selectedProject ? form.target : "none"}
                onChange={(e) => setForm({ ...form, target: e.target.value as RegisterTarget })}
                disabled={!selectedProject}
              >
                {(Object.keys(TARGET_LABELS) as RegisterTarget[]).map((t) => (
                  <option key={t} value={t}>
                    {TARGET_LABELS[t]}
                  </option>
                ))}
              </Select>
              {selectedProject && form.target === "expense" ? (
                <Select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                >
                  {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {EXPENSE_CATEGORIES[c]}
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>
            {!selectedProject ? (
              <p className="mt-2 text-[11px] text-amber-600">
                案件未定のため、書類のみ保存されます（収支には反映されません）
              </p>
            ) : null}
          </Card>

          <div className="flex items-center justify-between gap-3 pb-4">
            <Button variant="ghost" onClick={() => setStep("type")}>
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Button>
            <Button size="lg" onClick={save} disabled={saving || form.amount <= 0}>
              {saving ? "保存中…" : "この内容で保存する"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "done" && done ? (
        <Card className="flex flex-col items-center gap-5 p-8 text-center sm:p-10">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-9 w-9 text-emerald-500" />
          </span>
          <div>
            <p className="text-lg font-bold text-neutral-900">保存が完了しました</p>
            <p className="mt-1 text-xs text-neutral-500">
              {done.projectId && done.target !== "none"
                ? `${yen(done.amount)} を${TARGET_LABELS[done.target].replace("として登録", "")}として案件に反映しました`
                : done.projectId
                  ? "書類を案件に保管しました"
                  : "案件未定の書類として保存しました。書類一覧からいつでも紐づけできます"}
            </p>
          </div>

          {done.projectId && doneFin ? (
            <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
              <p className="text-xs font-bold text-neutral-700">{done.projectName}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-left">
                <div>
                  <p className="text-[10px] text-neutral-400">売上</p>
                  <p className="tnum text-sm font-bold text-neutral-800">{yen(doneFin.revenueTotal)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400">粗利益</p>
                  <p className={cn("tnum text-sm font-bold", doneFin.profit < 0 ? "text-red-600" : "text-neutral-800")}>
                    {yen(doneFin.profit)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400">利益率</p>
                  <p className="tnum text-sm font-bold text-neutral-800">
                    {doneFin.profitRate !== null ? pct1(doneFin.profitRate) : "—"}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <ProfitBadge fin={doneFin} />
              </div>
            </div>
          ) : null}

          <div className="flex w-full max-w-sm flex-col gap-2">
            <Button size="lg" onClick={reset}>
              <Camera className="h-5 w-5" />
              続けて登録する
            </Button>
            {done.projectId ? (
              <Link href={`/app/projects/${done.projectId}`} className="w-full">
                <Button variant="secondary" size="lg" className="w-full">
                  案件を見る
                </Button>
              </Link>
            ) : (
              <Link href="/app/documents" className="w-full">
                <Button variant="secondary" size="lg" className="w-full">
                  書類一覧を見る
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ) : null}
    </PageContainer>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UploadContent />
    </Suspense>
  );
}
