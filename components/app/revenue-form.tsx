"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { REVENUE_STATUSES } from "@/lib/constants";
import { calcTax, yen } from "@/lib/format";
import { addRevenue, updateRevenue, useDB } from "@/lib/store";
import type { Revenue, RevenueStatus, TaxType } from "@/lib/types";

interface RevenueFormProps {
  open: boolean;
  onClose: () => void;
  /** 案件詳細から開く場合は固定 */
  projectId?: string;
  revenue?: Revenue | null;
}

interface FormState {
  projectId: string;
  title: string;
  amountInput: number;
  taxType: TaxType;
  status: RevenueStatus;
  billingDueDate: string;
  billedDate: string;
  paymentDueDate: string;
  paidDate: string;
  memo: string;
}

function initialState(projectId?: string, revenue?: Revenue | null): FormState {
  // 編集時: 税別入力だった場合は税抜額を入力欄に戻す
  const amountInput = revenue
    ? revenue.taxType === "exclusive"
      ? revenue.amount - revenue.taxAmount
      : revenue.amount
    : 0;
  return {
    projectId: revenue?.projectId ?? projectId ?? "",
    title: revenue?.title ?? "",
    amountInput,
    taxType: revenue?.taxType ?? "inclusive",
    status: revenue?.status ?? "unbilled",
    billingDueDate: revenue?.billingDueDate ?? "",
    billedDate: revenue?.billedDate ?? "",
    paymentDueDate: revenue?.paymentDueDate ?? "",
    paidDate: revenue?.paidDate ?? "",
    memo: revenue?.memo ?? "",
  };
}

export function RevenueForm({ open, onClose, projectId, revenue }: RevenueFormProps) {
  const db = useDB();
  const [form, setForm] = useState<FormState>(() => initialState(projectId, revenue));

  useEffect(() => {
    if (open) setForm(initialState(projectId, revenue));
  }, [open, projectId, revenue]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const tax = calcTax(form.amountInput, form.taxType);

  const save = () => {
    if (!form.projectId) {
      toast({ title: "案件を選択してください", variant: "error" });
      return;
    }
    if (!form.title.trim()) {
      toast({ title: "売上名を入力してください", variant: "error" });
      return;
    }
    if (form.amountInput <= 0) {
      toast({ title: "金額を入力してください", variant: "error" });
      return;
    }

    const input = {
      projectId: form.projectId,
      title: form.title.trim(),
      amount: tax.total,
      taxType: form.taxType,
      taxAmount: tax.tax,
      billingDueDate: form.billingDueDate || null,
      billedDate: form.billedDate || null,
      paymentDueDate: form.paymentDueDate || null,
      paidDate: form.paidDate || null,
      status: form.status,
      memo: form.memo,
      documentId: revenue?.documentId ?? null,
    };

    if (revenue) {
      updateRevenue(revenue.id, input);
      toast({ title: "売上を更新しました" });
    } else {
      addRevenue(input);
      toast({ title: "売上を登録しました", description: `${form.title} ${yen(tax.total)}` });
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={revenue ? "売上を編集" : "売上を登録"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={save}>{revenue ? "保存する" : "登録する"}</Button>
        </>
      }
    >
      <div className="grid gap-4">
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
        <Field label="売上名" required>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="例：着手金 / 完工金 / 追加工事分"
          />
        </Field>
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
        <Field label="ステータス">
          <Segmented
            value={form.status}
            onChange={(v) => set("status", v)}
            options={(Object.keys(REVENUE_STATUSES) as RevenueStatus[]).map((s) => ({
              value: s,
              label: REVENUE_STATUSES[s].label,
            }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="請求予定日">
            <Input
              type="date"
              value={form.billingDueDate}
              onChange={(e) => set("billingDueDate", e.target.value)}
            />
          </Field>
          <Field label="請求日">
            <Input
              type="date"
              value={form.billedDate}
              onChange={(e) => {
                set("billedDate", e.target.value);
                if (e.target.value && form.status === "unbilled") set("status", "billed");
              }}
            />
          </Field>
          <Field label="入金予定日">
            <Input
              type="date"
              value={form.paymentDueDate}
              onChange={(e) => set("paymentDueDate", e.target.value)}
            />
          </Field>
          <Field label="入金日">
            <Input
              type="date"
              value={form.paidDate}
              onChange={(e) => {
                set("paidDate", e.target.value);
                if (e.target.value) set("status", "paid");
              }}
            />
          </Field>
        </div>
        <Field label="メモ">
          <Textarea rows={2} value={form.memo} onChange={(e) => set("memo", e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}
