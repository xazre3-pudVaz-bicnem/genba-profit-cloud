"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/shared/button";
import { Dialog } from "@/components/shared/dialog";
import { Input } from "@/components/shared/input";
import { Field } from "@/components/shared/label";
import { MoneyInput } from "@/components/shared/money-input";
import { Segmented } from "@/components/shared/segmented";
import { Select } from "@/components/shared/select";
import { Textarea } from "@/components/shared/textarea";
import { toast } from "@/components/shared/toast";
import { COST_TYPES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/app/constants";
import { calcTax, todayISO, yen } from "@/lib/shared/format";
import { addCost, updateCost, useDB } from "@/lib/app/data-store";
import type { Cost, CostStatus, CostType, ExpenseCategory, PaymentMethod, TaxType } from "@/lib/app/types";

interface CostFormProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  cost?: Cost | null;
  defaultType?: CostType;
}

interface FormState {
  projectId: string;
  type: CostType;
  vendorName: string;
  title: string;
  category: ExpenseCategory;
  amountInput: number;
  taxType: TaxType;
  paymentMethod: PaymentMethod | "";
  purchaseDate: string;
  paymentDueDate: string;
  paidDate: string;
  status: CostStatus;
  memo: string;
}

function initialState(projectId?: string, cost?: Cost | null, defaultType?: CostType): FormState {
  const amountInput = cost
    ? cost.taxType === "exclusive"
      ? cost.amount - cost.taxAmount
      : cost.amount
    : 0;
  return {
    projectId: cost?.projectId ?? projectId ?? "",
    type: cost?.type ?? defaultType ?? "material",
    vendorName: cost?.vendorName ?? "",
    title: cost?.title ?? "",
    category: cost?.category ?? "site_misc",
    amountInput,
    taxType: cost?.taxType ?? "inclusive",
    paymentMethod: cost?.paymentMethod ?? "",
    purchaseDate: cost?.purchaseDate ?? todayISO(),
    paymentDueDate: cost?.paymentDueDate ?? "",
    paidDate: cost?.paidDate ?? "",
    status: cost?.status ?? "paid",
    memo: cost?.memo ?? "",
  };
}

const VENDOR_LABELS: Record<CostType, { vendor: string; title: string; placeholder: string }> = {
  order: { vendor: "発注先", title: "内容", placeholder: "例：配管工事一式" },
  material: { vendor: "購入先", title: "品目", placeholder: "例：クロス材・木材" },
  expense: { vendor: "支払先", title: "内容", placeholder: "例：現場前パーキング" },
};

export function CostForm({ open, onClose, projectId, cost, defaultType }: CostFormProps) {
  const db = useDB();
  const [form, setForm] = useState<FormState>(() => initialState(projectId, cost, defaultType));

  useEffect(() => {
    if (open) setForm(initialState(projectId, cost, defaultType));
  }, [open, projectId, cost, defaultType]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const tax = calcTax(form.amountInput, form.taxType);
  const labels = VENDOR_LABELS[form.type];

  const save = () => {
    if (!form.projectId) {
      toast({ title: "案件を選択してください", variant: "error" });
      return;
    }
    if (!form.vendorName.trim() && !form.title.trim()) {
      toast({ title: `${labels.vendor}または${labels.title}を入力してください`, variant: "error" });
      return;
    }
    if (form.amountInput <= 0) {
      toast({ title: "金額を入力してください", variant: "error" });
      return;
    }

    const input = {
      projectId: form.projectId,
      type: form.type,
      vendorName: form.vendorName.trim(),
      title: form.title.trim(),
      category: form.type === "expense" ? form.category : null,
      amount: tax.total,
      taxType: form.taxType,
      taxAmount: tax.tax,
      paymentMethod: form.paymentMethod || null,
      purchaseDate: form.purchaseDate || null,
      paymentDueDate: form.paymentDueDate || null,
      paidDate: form.paidDate || null,
      status: form.status,
      memo: form.memo,
      documentId: cost?.documentId ?? null,
    };

    if (cost) {
      updateCost(cost.id, input);
      toast({ title: `${COST_TYPES[form.type].shortLabel}を更新しました` });
    } else {
      addCost(input);
      toast({
        title: `${COST_TYPES[form.type].shortLabel}を登録しました`,
        description: `${form.vendorName || form.title} ${yen(tax.total)}`,
      });
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={cost ? "原価を編集" : "原価を登録"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={save}>{cost ? "保存する" : "登録する"}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="種別">
          <Segmented
            value={form.type}
            onChange={(v) => set("type", v)}
            options={(Object.keys(COST_TYPES) as CostType[]).map((t) => ({
              value: t,
              label: COST_TYPES[t].shortLabel,
            }))}
          />
        </Field>
        {!projectId ? (
          <Field label="案件" required>
            <Select value={form.projectId} onChange={(e) => set("projectId", e.target.value)}>
              <option value="">案件を選択</option>
              {db.projects
                .filter((p) => p.status !== "lost")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
          </Field>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={labels.vendor} required>
            <Input
              value={form.vendorName}
              onChange={(e) => set("vendorName", e.target.value)}
              placeholder="例：コーナンPRO / 佐藤設備"
            />
          </Field>
          <Field label={labels.title}>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={labels.placeholder}
            />
          </Field>
        </div>
        {form.type === "expense" ? (
          <Field label="経費カテゴリ">
            <Select
              value={form.category}
              onChange={(e) => set("category", e.target.value as ExpenseCategory)}
            >
              {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORIES[c]}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="金額" required>
            <MoneyInput value={form.amountInput} onChange={(v) => set("amountInput", v)} />
          </Field>
          <Field label="税区分">
            <Segmented
              value={form.taxType}
              onChange={(v) => set("taxType", v)}
              options={[
                { value: "inclusive", label: "税込" },
                { value: "exclusive", label: "税別" },
                { value: "none", label: "非課税" },
              ]}
            />
            <p className="mt-1.5 text-[11px] text-neutral-400 tnum">
              税込合計 {yen(tax.total)}（うち消費税 {yen(tax.tax)}）
            </p>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="支払方法">
            <Select
              value={form.paymentMethod}
              onChange={(e) => set("paymentMethod", e.target.value as PaymentMethod | "")}
            >
              <option value="">未設定</option>
              {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHODS[m]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={form.type === "material" ? "購入日" : "発生日"}>
            <Input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => set("purchaseDate", e.target.value)}
            />
          </Field>
          <Field label="支払予定日">
            <Input
              type="date"
              value={form.paymentDueDate}
              onChange={(e) => set("paymentDueDate", e.target.value)}
            />
          </Field>
          <Field label="支払日">
            <Input
              type="date"
              value={form.paidDate}
              onChange={(e) => {
                set("paidDate", e.target.value);
                set("status", e.target.value ? "paid" : "unpaid");
              }}
            />
          </Field>
        </div>
        <Field label="支払ステータス">
          <Segmented
            value={form.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "unpaid", label: "未払い" },
              { value: "paid", label: "支払済" },
            ]}
          />
        </Field>
        <Field label="メモ">
          <Textarea rows={2} value={form.memo} onChange={(e) => set("memo", e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}
