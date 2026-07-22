"use client";

import { ArrowLeft, CheckCircle2, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/shared/button";
import { Card, CardHeader } from "@/components/shared/card";
import { Input } from "@/components/shared/input";
import { Field } from "@/components/shared/label";
import { MoneyInput } from "@/components/shared/money-input";
import { Select } from "@/components/shared/select";
import { toast } from "@/components/shared/toast";
import { EXPENSE_CATEGORIES } from "@/lib/app/constants";
import {
  addCost,
  addDocument,
  addRevenue,
  updateDocument,
  uploadDocumentFile,
  useDB,
  useSession,
} from "@/lib/app/data-store";
import {
  extractRow,
  SHEET_COLUMN_LABELS,
  type ParsedSheet,
  type SheetColumnKey,
} from "@/lib/app/sheet";
import type { CostType, ExpenseCategory } from "@/lib/app/types";
import { calcTax, todayISO, yen } from "@/lib/shared/format";
import { cn } from "@/lib/shared/utils";

// ============================================================
// Excel / CSV 読み込みの確認画面
// デフォルトは「合計金額だけ登録」（現場ユーザー向けに最短）。
// 明細を1行ずつ原価登録する方法も選べる。
// ============================================================

type ImportMode = "total" | "rows" | "revenue" | "none";

const MODE_LABELS: { value: ImportMode; label: string; description: string }[] = [
  { value: "total", label: "合計金額だけ登録", description: "1件の原価としてまとめて登録（おすすめ）" },
  { value: "rows", label: "1行ずつ登録", description: "明細の行ごとに原価を登録" },
  { value: "revenue", label: "売上として登録", description: "合計金額を売上に登録" },
  { value: "none", label: "書類のみ保存", description: "収支には反映しない" },
];

const COST_TYPE_OPTIONS: { value: CostType; label: string }[] = [
  { value: "material", label: "材料費" },
  { value: "order", label: "外注費" },
  { value: "expense", label: "経費" },
];

export function SheetImport({
  file,
  parsed,
  onBack,
}: {
  file: File;
  parsed: ParsedSheet;
  onBack: () => void;
}) {
  const db = useDB();
  const session = useSession();

  const [columns, setColumns] = useState<SheetColumnKey[]>(parsed.guessedColumns);
  const [mode, setMode] = useState<ImportMode>("total");
  const [projectId, setProjectId] = useState<string>("");
  const [costType, setCostType] = useState<CostType>("material");
  const [category, setCategory] = useState<ExpenseCategory>("site_misc");
  const [saving, setSaving] = useState(false);
  const [doneCount, setDoneCount] = useState<number | null>(null);

  // 割り当て済み列で全行を解釈
  const extracted = useMemo(
    () => parsed.rows.map((r) => extractRow(r, columns)),
    [parsed.rows, columns]
  );
  const detectedTotal = useMemo(
    () => extracted.reduce((acc, r) => acc + (r.amount > 0 ? r.amount : 0), 0),
    [extracted]
  );

  const first = extracted.find((r) => r.vendor || r.date) ?? null;
  const [vendor, setVendor] = useState(first?.vendor ?? "");
  const [date, setDate] = useState(first?.date ?? todayISO());
  const [amount, setAmount] = useState(detectedTotal);

  const setColumn = (index: number, key: SheetColumnKey) => {
    setColumns((prev) => {
      const next = [...prev];
      // 同じ役割は1列だけ（既存の割り当てを解除）
      if (key !== "none") {
        for (let i = 0; i < next.length; i++) if (next[i] === key) next[i] = "none";
      }
      next[index] = key;
      return next;
    });
  };

  const save = async () => {
    if (mode !== "none" && !projectId) {
      toast({ title: "案件を選択してください", variant: "error" });
      return;
    }
    if ((mode === "total" || mode === "revenue") && amount <= 0) {
      toast({ title: "金額を入力してください", variant: "error" });
      return;
    }
    setSaving(true);
    try {
      // 原本を保存（本番モードのみStorageへ。失敗しても登録は続行）
      let filePath: string | null = null;
      try {
        filePath = await uploadDocumentFile(file, projectId || null);
      } catch (err) {
        toast({
          title: "ファイルの保存に失敗しました",
          description: `${err instanceof Error ? err.message : ""} データの登録は続行します`.trim(),
          variant: "error",
        });
      }

      const doc = addDocument({
        projectId: projectId || null,
        uploadedBy: session?.name ?? "自分",
        documentType: "other",
        fileUrl: filePath,
        thumbnailUrl: null,
        vendorName: vendor || parsed.fileName,
        documentDate: date || null,
        totalAmount: mode === "rows" ? detectedTotal : amount,
        taxAmount: null,
        ocrText: `${parsed.fileName}（${parsed.rows.length}行）`,
        ai: null,
        assignmentConfidence: null,
        status: projectId ? (mode === "none" ? "analyzed" : "registered") : "needs_review",
        registeredTo: null,
      });

      let registered = 0;
      if (mode === "total" && projectId) {
        const cost = addCost({
          projectId,
          type: costType,
          vendorName: vendor,
          title: parsed.fileName,
          category: costType === "expense" ? category : null,
          amount,
          taxType: "inclusive",
          taxAmount: calcTax(amount, "inclusive").tax,
          paymentMethod: null,
          purchaseDate: date || null,
          paymentDueDate: null,
          paidDate: date || null,
          status: "paid",
          memo: `${parsed.fileName} から合計登録`,
          documentId: doc.id,
        });
        updateDocument(doc.id, { registeredTo: { kind: "cost", id: cost.id } });
        registered = 1;
      } else if (mode === "rows" && projectId) {
        for (const row of extracted) {
          if (row.amount <= 0) continue;
          addCost({
            projectId,
            type: costType,
            vendorName: row.vendor || vendor,
            title: row.item || parsed.fileName,
            category: costType === "expense" ? category : null,
            amount: row.amount,
            taxType: "inclusive",
            taxAmount: row.tax > 0 ? Math.min(row.tax, row.amount) : calcTax(row.amount, "inclusive").tax,
            paymentMethod: null,
            purchaseDate: row.date ?? date ?? null,
            paymentDueDate: null,
            paidDate: row.date ?? date ?? null,
            status: "paid",
            memo: row.memo || `${parsed.fileName} から取り込み`,
            documentId: doc.id,
          });
          registered += 1;
        }
      } else if (mode === "revenue" && projectId) {
        const rev = addRevenue({
          projectId,
          title: parsed.fileName,
          amount,
          taxType: "inclusive",
          taxAmount: calcTax(amount, "inclusive").tax,
          billingDueDate: date || null,
          billedDate: null,
          paymentDueDate: null,
          paidDate: null,
          status: "unbilled",
          memo: `${parsed.fileName} から登録`,
          documentId: doc.id,
        });
        updateDocument(doc.id, { registeredTo: { kind: "revenue", id: rev.id } });
        registered = 1;
      }

      setDoneCount(registered);
      const modeLabel = MODE_LABELS.find((m) => m.value === mode)?.label ?? "";
      toast({
        title:
          mode === "none"
            ? "書類を保存しました"
            : mode === "revenue"
              ? "売上として登録しました"
              : `${COST_TYPE_OPTIONS.find((c) => c.value === costType)?.label}として登録しました`,
        description: mode === "rows" ? `${registered}件の明細を登録しました` : modeLabel,
      });
    } catch (err) {
      console.error("[sheet-import] 登録エラー:", err);
      toast({
        title: "登録に失敗しました",
        description: "時間をおいて再度お試しください",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // 完了画面
  if (doneCount !== null) {
    return (
      <Card className="flex flex-col items-center gap-5 p-8 text-center sm:p-10">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-9 w-9 text-emerald-500" />
        </span>
        <div>
          <p className="text-lg font-bold text-neutral-900">保存が完了しました</p>
          <p className="mt-1 text-xs text-neutral-500">
            {mode === "none"
              ? "書類として保存しました"
              : mode === "rows"
                ? `${doneCount}件の明細を登録しました`
                : `${yen(amount)} を登録しました`}
          </p>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-2">
          <Button size="lg" onClick={onBack}>
            続けて登録する
          </Button>
          {projectId ? (
            <Link href={`/app/projects/${projectId}`} className="w-full">
              <Button variant="secondary" size="lg" className="w-full">
                案件を見る
              </Button>
            </Link>
          ) : null}
        </div>
      </Card>
    );
  }

  const previewRows = parsed.rows.slice(0, 10);

  return (
    <div className="space-y-3">
      {/* ファイル情報 */}
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-neutral-900">{parsed.fileName}</p>
            <p className="text-xs text-neutral-400">
              {parsed.rows.length}行を読み取りました・合計 {yen(detectedTotal)}
            </p>
          </div>
        </div>
      </Card>

      {/* プレビュー（先頭10行）+ 列の割り当て */}
      <Card className="p-5">
        <p className="mb-1 text-sm font-bold text-neutral-900">読み取った内容</p>
        <p className="mb-3 text-[11px] text-neutral-400">
          列の使い方が違う場合は、各列の上のプルダウンで変更できます
        </p>
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="bg-neutral-50">
                {parsed.headers.map((h, i) => (
                  <th key={i} className="border-b border-neutral-200 px-2 py-2 text-left">
                    <Select
                      value={columns[i]}
                      onChange={(e) => setColumn(i, e.target.value as SheetColumnKey)}
                      className="h-8 w-full min-w-[92px] text-[11px]"
                    >
                      {(Object.keys(SHEET_COLUMN_LABELS) as SheetColumnKey[]).map((k) => (
                        <option key={k} value={k}>
                          {SHEET_COLUMN_LABELS[k]}
                        </option>
                      ))}
                    </Select>
                    <p className="mt-1 truncate text-[10px] font-medium text-neutral-400">{h}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {previewRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="truncate px-2 py-1.5 text-neutral-600">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parsed.rows.length > 10 ? (
          <p className="mt-2 text-[11px] text-neutral-400">
            ほか {parsed.rows.length - 10} 行（登録時はすべての行が対象になります）
          </p>
        ) : null}
      </Card>

      {/* 登録方法 */}
      <Card className="p-5">
        <p className="mb-3 text-sm font-bold text-neutral-900">どうやって登録しますか？</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODE_LABELS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-all cursor-pointer",
                mode === m.value
                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              )}
            >
              <p className={cn("text-[13px] font-bold", mode === m.value ? "text-brand-700" : "text-neutral-800")}>
                {m.label}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-400">{m.description}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3.5">
          <Field label="案件" required={mode !== "none"}>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">{mode === "none" ? "案件未定（あとから紐づけ）" : "案件を選択"}</option>
              {db.projects
                .filter((p) => p.status !== "lost")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
          </Field>

          {mode === "total" || mode === "rows" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="登録先">
                <Select value={costType} onChange={(e) => setCostType(e.target.value as CostType)}>
                  {COST_TYPE_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {costType === "expense" ? (
                <Field label="経費の種類">
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  >
                    {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((c) => (
                      <option key={c} value={c}>
                        {EXPENSE_CATEGORIES[c]}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </div>
          ) : null}

          {mode !== "rows" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="取引先">
                <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="会社名・店名" />
              </Field>
              <Field label="日付">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
          ) : null}

          {mode === "total" || mode === "revenue" ? (
            <Field label="金額（税込）" required>
              <MoneyInput value={amount} onChange={setAmount} />
            </Field>
          ) : null}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3 pb-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          やり直す
        </Button>
        <Button size="lg" onClick={save} disabled={saving}>
          {saving ? "保存中…" : "この内容で登録する"}
        </Button>
      </div>
    </div>
  );
}
