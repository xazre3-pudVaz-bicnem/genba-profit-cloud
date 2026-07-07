"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { LineItemsEditor, newLineItem } from "@/components/app/line-items-editor";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { Button } from "@/components/shared/button";
import { Card, CardHeader } from "@/components/shared/card";
import { Input } from "@/components/shared/input";
import { Field } from "@/components/shared/label";
import { Select } from "@/components/shared/select";
import { PageSkeleton } from "@/components/shared/skeleton";
import { Textarea } from "@/components/shared/textarea";
import { toast } from "@/components/shared/toast";
import { INVOICE_STATUSES } from "@/lib/app/constants";
import { dateFromToday, taxFromSubtotal, todayISO, yen } from "@/lib/shared/format";
import { addInvoice, addRevenue, updateInvoice, useDB } from "@/lib/app/data-store";
import type { InvoiceStatus, LineItem } from "@/lib/app/types";

function InvoiceEditor() {
  const db = useDB();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  const editing = editId ? db.invoices.find((i) => i.id === editId) : null;
  const projectParam = params.get("project");
  const projectPrefill = projectParam ? db.projects.find((p) => p.id === projectParam) : null;

  const [projectId, setProjectId] = useState(editing?.projectId ?? projectPrefill?.id ?? "");
  const [customerName, setCustomerName] = useState(
    editing?.customerName ?? projectPrefill?.customerName ?? ""
  );
  const [title, setTitle] = useState(
    editing?.title ?? (projectPrefill ? `${projectPrefill.name} 工事代金` : "")
  );
  const [invoiceDate, setInvoiceDate] = useState(editing?.invoiceDate ?? todayISO());
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? dateFromToday(30));
  const [status, setStatus] = useState<InvoiceStatus>(editing?.status ?? "sent");
  const [memo, setMemo] = useState(editing?.memo ?? "");
  const [items, setItems] = useState<LineItem[]>(
    editing?.items.length ? editing.items : [newLineItem()]
  );
  const [alsoRevenue, setAlsoRevenue] = useState(true);

  const subtotal = useMemo(() => items.reduce((a, i) => a + i.amount, 0), [items]);
  const taxAmount = taxFromSubtotal(subtotal);
  const total = subtotal + taxAmount;

  if (!db.hydrated) return <PageSkeleton />;

  const save = () => {
    if (!customerName.trim()) {
      toast({ title: "宛名を入力してください", variant: "error" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "件名を入力してください", variant: "error" });
      return;
    }
    const validItems = items.filter((i) => i.name.trim());
    if (validItems.length === 0) {
      toast({ title: "明細を1行以上入力してください", variant: "error" });
      return;
    }

    const input = {
      projectId: projectId || null,
      customerName: customerName.trim(),
      title: title.trim(),
      items: validItems,
      subtotal,
      taxAmount,
      total,
      invoiceDate: invoiceDate || null,
      dueDate: dueDate || null,
      paidDate: editing?.paidDate ?? null,
      status,
      memo,
    };

    if (editing) {
      updateInvoice(editing.id, input);
      toast({ title: "請求書を更新しました" });
      router.push(`/app/invoices/${editing.id}`);
    } else {
      const created = addInvoice(input);
      // 案件の売上にも反映（請求済として登録）
      if (alsoRevenue && projectId) {
        addRevenue({
          projectId,
          title: title.trim(),
          amount: total,
          taxType: "exclusive",
          taxAmount,
          billingDueDate: invoiceDate || null,
          billedDate: status !== "draft" ? invoiceDate || null : null,
          paymentDueDate: dueDate || null,
          paidDate: null,
          status: status === "draft" ? "unbilled" : "billed",
          memo: `請求書 ${created.invoiceNumber} から自動登録`,
          documentId: null,
        });
      }
      toast({ title: "請求書を作成しました", description: `${created.invoiceNumber}・${yen(total)}` });
      router.push(`/app/invoices/${created.id}`);
    }
  };

  return (
    <PageContainer className="max-w-4xl">
      <AppPageHeader
        title={editing ? "請求書を編集" : "請求書を作成"}
        backHref={editing ? `/app/invoices/${editing.id}` : "/app/invoices"}
        backLabel="請求一覧"
        actions={<Button onClick={save}>{editing ? "保存する" : "作成する"}</Button>}
      />

      <div className="space-y-3">
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="宛名" required>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="例：山田 太郎 / 株式会社〇〇"
              />
            </Field>
            <Field label="案件">
              <Select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  const p = db.projects.find((x) => x.id === e.target.value);
                  if (p && !customerName) setCustomerName(p.customerName);
                }}
              >
                <option value="">案件に紐づけない</option>
                {db.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="件名" required className="sm:col-span-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：キッチンリフォーム工事代金"
              />
            </Field>
            <Field label="請求日">
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </Field>
            <Field label="支払期限">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label="ステータス">
              <Select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
                {(Object.keys(INVOICE_STATUSES) as InvoiceStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {INVOICE_STATUSES[s].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="明細" description="単価は税別で入力してください" />
          <div className="px-5 pb-5 pt-2">
            <LineItemsEditor items={items} onChange={setItems} />
            <div className="mt-5 ml-auto w-full max-w-xs space-y-1.5 rounded-xl bg-neutral-50 p-4">
              <p className="flex justify-between text-xs text-neutral-500">
                <span>小計（税別）</span>
                <span className="tnum font-medium text-neutral-800">{yen(subtotal)}</span>
              </p>
              <p className="flex justify-between text-xs text-neutral-500">
                <span>消費税（10%）</span>
                <span className="tnum font-medium text-neutral-800">{yen(taxAmount)}</span>
              </p>
              <p className="flex justify-between border-t border-neutral-200 pt-1.5 text-sm font-bold text-neutral-900">
                <span>合計（税込）</span>
                <span className="tnum">{yen(total)}</span>
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <Field label="備考">
            <Textarea rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </Field>
          {!editing && projectId ? (
            <label className="mt-4 flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={alsoRevenue}
                onChange={(e) => setAlsoRevenue(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-orange-600"
              />
              <span>
                <span className="block text-xs font-semibold text-neutral-800">
                  この金額を案件の売上にも登録する
                </span>
                <span className="block text-[11px] text-neutral-400">
                  案件の収支（未入金額）に自動で反映されます
                </span>
              </span>
            </label>
          ) : null}
        </Card>

        <div className="flex justify-end pb-4">
          <Button size="lg" onClick={save}>
            {editing ? "保存する" : "請求書を作成する"}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InvoiceEditor />
    </Suspense>
  );
}
