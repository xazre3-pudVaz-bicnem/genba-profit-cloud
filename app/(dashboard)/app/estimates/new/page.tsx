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
import { ESTIMATE_STATUSES } from "@/lib/app/constants";
import { dateFromToday, taxFromSubtotal, todayISO, yen } from "@/lib/shared/format";
import { addEstimate, updateEstimate, useDB, useSession } from "@/lib/app/data-store";
import { canEditData } from "@/lib/app/permissions";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldAlert } from "lucide-react";
import type { EstimateStatus, LineItem } from "@/lib/app/types";

function EstimateEditor() {
  const db = useDB();
  const session = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  const editing = editId ? db.estimates.find((e) => e.id === editId) : null;
  const projectParam = params.get("project");
  const projectPrefill = projectParam ? db.projects.find((p) => p.id === projectParam) : null;

  const [projectId, setProjectId] = useState(editing?.projectId ?? projectPrefill?.id ?? "");
  const [customerName, setCustomerName] = useState(
    editing?.customerName ?? projectPrefill?.customerName ?? ""
  );
  const [title, setTitle] = useState(
    editing?.title ?? (projectPrefill ? `${projectPrefill.name} 御見積` : "")
  );
  const [issueDate, setIssueDate] = useState(editing?.issueDate ?? todayISO());
  const [validUntil, setValidUntil] = useState(editing?.validUntil ?? dateFromToday(30));
  const [status, setStatus] = useState<EstimateStatus>(editing?.status ?? "draft");
  const [memo, setMemo] = useState(editing?.memo ?? "");
  const [items, setItems] = useState<LineItem[]>(
    editing?.items.length ? editing.items : [newLineItem()]
  );

  const subtotal = useMemo(() => items.reduce((a, i) => a + i.amount, 0), [items]);
  const taxAmount = taxFromSubtotal(subtotal);
  const total = subtotal + taxAmount;

  if (!db.hydrated) return <PageSkeleton />;

  // viewer（閲覧のみ）は書類作成不可
  if (!canEditData(session?.role)) {
    return (
      <PageContainer className="max-w-3xl">
        <AppPageHeader title="見積書" />
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-card">
          <EmptyState icon={ShieldAlert} title="書類作成の権限がありません" description="閲覧のみの権限のため、見積書の作成はできません。" />
        </div>
      </PageContainer>
    );
  }

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
      issueDate: issueDate || null,
      validUntil: validUntil || null,
      status,
      memo,
    };

    if (editing) {
      updateEstimate(editing.id, input);
      toast({ title: "見積書を更新しました" });
      router.push(`/app/estimates/${editing.id}`);
    } else {
      const created = addEstimate(input);
      toast({ title: "見積書を作成しました", description: `${created.estimateNumber}・${yen(total)}` });
      router.push(`/app/estimates/${created.id}`);
    }
  };

  return (
    <PageContainer className="max-w-4xl">
      <AppPageHeader
        title={editing ? "見積書を編集" : "見積書を作成"}
        backHref={editing ? `/app/estimates/${editing.id}` : "/app/estimates"}
        backLabel="見積一覧"
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
                placeholder="例：キッチンリフォーム工事 御見積"
              />
            </Field>
            <Field label="発行日">
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
            <Field label="有効期限">
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </Field>
            <Field label="ステータス">
              <Select value={status} onChange={(e) => setStatus(e.target.value as EstimateStatus)}>
                {(Object.keys(ESTIMATE_STATUSES) as EstimateStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {ESTIMATE_STATUSES[s].label}
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
            <Textarea
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例：本見積の有効期限は発行日より30日間です。"
            />
          </Field>
        </Card>

        <div className="flex justify-end pb-4">
          <Button size="lg" onClick={save}>
            {editing ? "保存する" : "見積書を作成する"}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

export default function NewEstimatePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EstimateEditor />
    </Suspense>
  );
}
