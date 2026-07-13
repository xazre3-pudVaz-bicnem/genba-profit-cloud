"use client";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  Info,
  ScanLine,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";
import { DocumentUploadBox } from "@/components/app/document-upload-box";
import { ProfitBadge } from "@/components/app/profit-badge";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { ProjectSelector } from "@/components/app/project-selector";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { Input } from "@/components/shared/input";
import { Field } from "@/components/shared/label";
import { MoneyInput } from "@/components/shared/money-input";
import { Select } from "@/components/shared/select";
import { PageSkeleton } from "@/components/shared/skeleton";
import { toast } from "@/components/shared/toast";
import { suggestProjects } from "@/lib/app/assign";
import { projectFinance } from "@/lib/app/calc";
import {
  DOCUMENT_TYPES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from "@/lib/app/constants";
import { calcTax, pct1, todayISO, yen } from "@/lib/shared/format";
import { analyzeDocument, analyzeMock, makeThumbnail, type AnalyzeOutcome } from "@/lib/app/ocr";
import {
  addCost,
  addDocument,
  addRevenue,
  getDB,
  updateDocument,
  uploadDocumentFile,
  useDB,
  useSession,
} from "@/lib/app/data-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/app/supabase";
import { isPdfFile } from "@/lib/app/upload";
import type {
  DocumentType,
  ExpenseCategory,
  PaymentMethod,
  RegisterTarget,
} from "@/lib/app/types";
import { cn } from "@/lib/shared/utils";

type Step = "pick" | "type" | "analyzing" | "confirm" | "done";

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "pick", label: "撮影" },
  { key: "type", label: "種別・案件" },
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
  order: "外注費として登録",
  expense: "経費として登録",
  revenue: "売上として登録",
  none: "書類のみ保存",
};

interface ConfirmForm {
  docType: DocumentType;
  vendor: string;
  date: string;
  amount: number;
  tax: number;
  itemsText: string;
  memo: string;
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
  const [taxTouched, setTaxTouched] = useState(false);
  const thumbRef = useRef<string | null>(null);
  // 解析開始時に作成した書類レコード（確認・保存はこのレコードを更新する）
  const docIdRef = useRef<string | null>(null);
  // Storageへ保存済みの原本パス（再解析時の二重アップロード防止）
  const uploadedPathRef = useRef<string | null>(null);
  // 解析開始時に選択されていた案件（候補スコアリングの文脈に使う）
  const analyzeProjectRef = useRef<string | null>(contextProjectId);

  const isPdf = file ? isPdfFile(file) : false;
  const isLive = isSupabaseConfigured() && session?.mode === "supabase";

  const candidates = useMemo(
    () =>
      suggestProjects(
        { ocr: outcome?.result ?? null, contextProjectId: analyzeProjectRef.current ?? contextProjectId },
        db
      ),
    [outcome, contextProjectId, db]
  );

  if (!db.hydrated) return <PageSkeleton />;

  const stepIndex = STEP_LABELS.findIndex((s) => s.key === step);

  const handleFile = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStep("type");
  };

  const startAnalyze = async () => {
    if (!file) return;
    setStep("analyzing");
    setTaxTouched(false);
    analyzeProjectRef.current = selectedProject;

    // 1) 原本をStorageへ保存（本番モードのみ・再解析時は再アップロードしない）。
    //    失敗しても手入力での登録は続行できる
    const uploadPromise: Promise<string | null> =
      isLive && !uploadedPathRef.current
        ? uploadDocumentFile(file, selectedProject).catch((err: unknown) => {
            toast({
              title: "ファイルの保存に失敗しました",
              description: `${err instanceof Error ? err.message : ""} 読み取り内容の登録は続行できます`.trim(),
              variant: "error",
            });
            return null;
          })
        : Promise.resolve(uploadedPathRef.current);
    const [thumb, filePath] = await Promise.all([makeThumbnail(file), uploadPromise]);
    thumbRef.current = thumb;
    uploadedPathRef.current = filePath;

    // 2) 書類レコードを「解析待ち」で作成（保存前に離脱しても書類一覧から登録できる）
    let docId = docIdRef.current;
    if (docId) {
      updateDocument(docId, {
        projectId: selectedProject,
        documentType: docType,
        ...(filePath ? { fileUrl: filePath } : {}),
        thumbnailUrl: thumb,
        status: "pending",
      });
    } else {
      const doc = addDocument({
        projectId: selectedProject,
        uploadedBy: session?.name ?? "自分",
        documentType: docType,
        fileUrl: filePath,
        thumbnailUrl: thumb,
        vendorName: "",
        documentDate: null,
        totalAmount: null,
        taxAmount: null,
        ocrText: "",
        ai: null,
        assignmentConfidence: null,
        status: "pending",
        registeredTo: null,
      });
      docId = doc.id;
      docIdRef.current = docId;
    }

    // 3) AI OCR（本番: /api/ocr が原本をStorageから取得して解析 / デモ: モック）
    let result: AnalyzeOutcome;
    if (isLive) {
      const sb = getSupabase();
      const token = sb ? ((await sb.auth.getSession()).data.session?.access_token ?? null) : null;
      [result] = await Promise.all([
        analyzeDocument(file, docType, { documentId: docId, filePath, accessToken: token }),
        new Promise((r) => setTimeout(r, 600)),
      ]);
    } else {
      [result] = await Promise.all([
        Promise.resolve(analyzeMock(docType)),
        new Promise((r) => setTimeout(r, 1100)),
      ]);
    }

    // 4) 結果を反映。本番モードで実OCRに失敗した場合はサンプル値を流し込まず手入力へ
    const ocrFailed = isLive && result.provider === "mock";
    const r = result.result;
    if (ocrFailed) {
      setOutcome({
        ...result,
        notice: result.notice ?? "AI読み取りに失敗しました。内容を手入力して登録できます。",
      });
      setForm({
        docType,
        vendor: "",
        date: todayISO(),
        amount: 0,
        tax: 0,
        itemsText: "",
        memo: "",
        paymentMethod: "",
        target: DEFAULT_TARGET[docType],
        category: "site_misc",
      });
      updateDocument(docId, { status: "needs_review" });
    } else {
      setOutcome(result);
      setForm({
        docType: r.documentType || docType,
        vendor: r.vendorName,
        date: r.documentDate || todayISO(),
        amount: r.totalAmount,
        tax: r.taxAmount || calcTax(r.totalAmount, "inclusive").tax,
        itemsText: r.items.map((i) => i.name).join("、"),
        memo: "",
        paymentMethod: r.paymentMethod ?? "",
        target: r.suggestedTarget ?? DEFAULT_TARGET[r.documentType || docType],
        category: r.suggestedCategory ?? "site_misc",
      });
      // 読み取り結果を書類レコードへ保存（確認待ち）。サーバー側でも保存済みだが、
      // ローカルキャッシュと直列書き込みキューの整合はこちらが担保する
      updateDocument(docId, {
        documentType: r.documentType || docType,
        vendorName: r.vendorName,
        documentDate: r.documentDate || null,
        totalAmount: r.totalAmount || null,
        taxAmount: r.taxAmount || null,
        ocrText: r.rawText ?? "",
        ai: r,
        assignmentConfidence: r.confidence,
        status: "needs_review",
      });
    }
    setStep("confirm");
  };

  const save = async () => {
    if (!form) return;
    const docId = docIdRef.current;
    if (!docId) return;
    setSaving(true);

    const tax = Math.max(0, Math.min(form.tax, form.amount));
    const ocrFailed = isLive && outcome?.provider === "mock";
    const effectiveTarget: RegisterTarget = selectedProject ? form.target : "none";
    const topCandidate = candidates[0];
    const confidence =
      selectedProject && topCandidate?.project.id === selectedProject
        ? topCandidate.confidence
        : selectedProject
          ? "medium"
          : null;

    // 確認・編集した内容で書類レコードを確定させる
    updateDocument(docId, {
      projectId: selectedProject,
      documentType: form.docType,
      vendorName: form.vendor,
      documentDate: form.date || null,
      totalAmount: form.amount,
      taxAmount: tax,
      ocrText: ocrFailed ? "" : (outcome?.result.rawText ?? ""),
      ai: ocrFailed ? null : (outcome?.result ?? null),
      assignmentConfidence: confidence,
      status: selectedProject ? (effectiveTarget === "none" ? "analyzed" : "registered") : "needs_review",
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
          memo: form.memo || `書類から登録（${form.vendor}）`,
          documentId: docId,
        });
        updateDocument(docId, { registeredTo: { kind: "revenue", id: rev.id }, status: "registered" });
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
          memo: form.memo || "写真から登録",
          documentId: docId,
        });
        updateDocument(docId, { registeredTo: { kind: "cost", id: cost.id }, status: "registered" });
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
      title:
        selectedProject && effectiveTarget !== "none"
          ? `${TARGET_LABELS[effectiveTarget].replace("として登録", "")}として登録しました`
          : "書類を保存しました",
      description:
        project && effectiveTarget !== "none"
          ? `${project.name}の利益率に反映しました`
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
    setTaxTouched(false);
    thumbRef.current = null;
    docIdRef.current = null;
    uploadedPathRef.current = null;
    analyzeProjectRef.current = contextProjectId;
  };

  const doneFin = done?.projectId ? projectFinance(done.projectId, db) : null;

  return (
    <PageContainer className="max-w-3xl">
      <AppPageHeader
        title="写真から登録"
        description="レシート・請求書・領収書を撮るだけで、案件の原価や売上に反映できます"
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

      {step === "pick" ? <DocumentUploadBox onFile={handleFile} /> : null}

      {step === "type" && previewUrl ? (
        <Card className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row">
            {isPdf ? (
              <div className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-10 sm:w-56">
                <FileText className="h-10 w-10 text-neutral-400" />
                <p className="max-w-full truncate text-xs font-medium text-neutral-600">
                  {file?.name}
                </p>
                <p className="text-[10px] text-neutral-400">PDFファイル</p>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="アップロードした書類"
                className="max-h-64 w-full rounded-xl border border-neutral-200 object-contain sm:w-56"
              />
            )}
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
              <div className="mt-4">
                <Field label="登録する案件（AI読み取り後に変更できます）">
                  <Select
                    value={selectedProject ?? ""}
                    onChange={(e) => setSelectedProject(e.target.value || null)}
                  >
                    <option value="">案件未定（あとから紐づけ）</option>
                    {db.projects
                      .filter((p) => p.status !== "lost")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </Select>
                </Field>
              </div>
              <div className="mt-5 flex justify-between">
                <Button variant="ghost" onClick={reset}>
                  <ArrowLeft className="h-4 w-4" />
                  撮り直す
                </Button>
                <Button onClick={startAnalyze}>
                  アップロードしてAIで読み取る
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
              {previewUrl && !isPdf ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="hidden h-40 w-32 rounded-xl border border-neutral-200 object-cover sm:block"
                />
              ) : isPdf ? (
                <div className="hidden h-40 w-32 flex-col items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 sm:flex">
                  <FileText className="h-8 w-8 text-neutral-400" />
                  <p className="text-[10px] text-neutral-400">PDF</p>
                </div>
              ) : null}
              <div className="grid flex-1 gap-3.5">
                <Field label="取引先">
                  <Input
                    value={form.vendor}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    placeholder="店名・会社名"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="日付">
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </Field>
                  <Field label="金額（税込）" required>
                    <MoneyInput
                      value={form.amount}
                      onChange={(v) =>
                        setForm({
                          ...form,
                          amount: v,
                          // 税額を手で編集していない間は自動計算に追従させる
                          tax: taxTouched ? form.tax : calcTax(v, "inclusive").tax,
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="うち消費税">
                    <MoneyInput
                      value={form.tax}
                      onChange={(v) => {
                        setTaxTouched(true);
                        setForm({ ...form, tax: v });
                      }}
                    />
                  </Field>
                  <Field label="メモ">
                    <Input
                      value={form.memo}
                      onChange={(e) => setForm({ ...form, memo: e.target.value })}
                      placeholder="任意"
                    />
                  </Field>
                </div>

                {/* 細かい項目は折りたたみ（最初から全部見せない） */}
                <details className="rounded-xl border border-neutral-100 bg-neutral-50/60 px-3.5 py-3">
                  <summary className="cursor-pointer list-none text-xs font-semibold text-neutral-500">
                    詳細を編集（書類の種類・品目・支払方法）
                  </summary>
                  <div className="mt-3 grid gap-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="書類の種類">
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
                </details>
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
            <Button
              size="lg"
              onClick={save}
              disabled={saving || (selectedProject !== null && form.target !== "none" && form.amount <= 0)}
            >
              {saving
                ? "保存中…"
                : selectedProject
                  ? TARGET_LABELS[form.target]
                  : TARGET_LABELS.none}
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
