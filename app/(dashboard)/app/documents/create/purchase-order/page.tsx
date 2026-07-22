"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { LineItemsEditor, newLineItem } from "@/components/app/line-items-editor";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { Button } from "@/components/shared/button";
import { Card, CardHeader } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/shared/input";
import { Field } from "@/components/shared/label";
import { Select } from "@/components/shared/select";
import { PageSkeleton } from "@/components/shared/skeleton";
import { Textarea } from "@/components/shared/textarea";
import { toast } from "@/components/shared/toast";
import {
  addPurchaseOrder,
  updatePurchaseOrder,
  useDB,
  useSession,
} from "@/lib/app/data-store";
import { canEditData } from "@/lib/app/permissions";
import { dateFromToday, taxFromSubtotal, todayISO, yen } from "@/lib/shared/format";
import type { LineItem } from "@/lib/app/types";

// ============================================================
// 発注書の作成・編集（外注先・協力会社への発注）
// 会社情報・インボイス番号は帳票側で自動反映するため、ここでは
// 現場ユーザーが入力する最小限の項目だけを表示する
// ============================================================

function PurchaseOrderEditor() {
  const db = useDB();
  const session = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  const editing = editId ? db.purchaseOrders.find((p) => p.id === editId) : null;
  const projectParam = params.get("project");
  const projectPrefill = projectParam ? db.projects.find((p) => p.id === projectParam) : null;

  const [projectId, setProjectId] = useState(editing?.projectId ?? projectPrefill?.id ?? "");
  const [vendorName, setVendorName] = useState(editing?.vendorName ?? "");
  const [title, setTitle] = useState(
    editing?.title ?? (projectPrefill ? `${projectPrefill.name} の発注` : "")
  );
  const [orderDate, setOrderDate] = useState(editing?.orderDate ?? todayISO());
  const [deliveryDate, setDeliveryDate] = useState(editing?.deliveryDate ?? dateFromToday(14));
  const [memo, setMemo] = useState(editing?.memo ?? "");
  const [items, setItems] = useState<LineItem[]>(
    editing?.items.length ? editing.items : [newLineItem()]
  );

  const subtotal = useMemo(() => items.reduce((a, i) => a + i.amount, 0), [items]);
  const taxAmount = taxFromSubtotal(subtotal);
  const total = subtotal + taxAmount;

  if (!db.hydrated) return <PageSkeleton />;

  if (!canEditData(session?.role)) {
    return (
      <PageContainer className="max-w-3xl">
        <AppPageHeader title="発注書" />
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-card">
          <EmptyState
            icon={ShieldAlert}
            title="書類作成の権限がありません"
            description="閲覧のみの権限のため、発注書の作成はできません。"
          />
        </div>
      </PageContainer>
    );
  }

  const save = () => {
    if (!vendorName.trim()) {
      toast({ title: "発注先を入力してください", variant: "error" });
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
      vendorName: vendorName.trim(),
      title: title.trim(),
      items: validItems,
      subtotal,
      taxAmount,
      total,
      orderDate: orderDate || null,
      deliveryDate: deliveryDate || null,
      status: editing?.status ?? ("draft" as const),
      memo,
    };

    if (editing) {
      updatePurchaseOrder(editing.id, input);
      toast({ title: "発注書を保存しました" });
      router.push(`/app/purchase-orders/${editing.id}`);
    } else {
      const po = addPurchaseOrder(input);
      toast({ title: "発注書を作成しました" });
      router.push(`/app/purchase-orders/${po.id}`);
    }
  };

  return (
    <PageContainer className="max-w-3xl">
      <AppPageHeader
        title={editing ? "発注書を編集" : "発注書を作る"}
        description="外注先・協力会社に出す発注書です"
        backHref="/app/documents/create"
        backLabel="書類作成"
        actions={<Button onClick={save}>保存する</Button>}
      />

      <div className="space-y-3">
        <Card>
          <CardHeader title="基本情報" />
          <div className="grid gap-4 px-5 pb-5 pt-2 sm:grid-cols-2">
            <Field label="案件">
              <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">案件を選択（任意）</option>
                {db.projects
                  .filter((p) => p.status !== "lost")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="発注先（協力会社）" required>
              <Input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="例：佐藤設備工業"
              />
            </Field>
            <Field label="件名" required className="sm:col-span-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：給排水設備工事の発注"
              />
            </Field>
            <Field label="発注日">
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </Field>
            <Field label="納期">
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="明細" description={`小計 ${yen(subtotal)}・消費税 ${yen(taxAmount)}・合計 ${yen(total)}`} />
          <div className="px-5 pb-5 pt-1">
            <LineItemsEditor items={items} onChange={setItems} />
          </div>
        </Card>

        <Card>
          <CardHeader title="備考" />
          <div className="px-5 pb-5">
            <Textarea
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="支払条件・注意事項など（任意）"
            />
          </div>
        </Card>

        <div className="flex justify-end pb-4">
          <Button size="lg" onClick={save}>
            保存する
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

export default function CreatePurchaseOrderPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PurchaseOrderEditor />
    </Suspense>
  );
}
