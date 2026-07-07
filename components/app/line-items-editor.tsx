"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { MoneyInput } from "@/components/shared/money-input";
import { uid, yen } from "@/lib/shared/format";
import type { LineItem } from "@/lib/app/types";

interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

export function newLineItem(): LineItem {
  return { id: uid(), name: "", quantity: 1, unit: "式", unitPrice: 0, amount: 0 };
}

/** 見積書・請求書の明細行エディタ */
export function LineItemsEditor({ items, onChange }: LineItemsEditorProps) {
  const update = (id: string, patch: Partial<LineItem>) => {
    onChange(
      items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        next.amount = Math.round(next.quantity * next.unitPrice);
        return next;
      })
    );
  };

  const remove = (id: string) => onChange(items.filter((item) => item.id !== id));

  return (
    <div className="space-y-2">
      {/* ヘッダー（PCのみ） */}
      <div className="hidden grid-cols-[1fr_72px_64px_128px_112px_36px] gap-2 px-1 text-[10px] font-bold text-neutral-400 sm:grid">
        <span>品目</span>
        <span className="text-right">数量</span>
        <span>単位</span>
        <span className="text-right">単価（税別）</span>
        <span className="text-right">金額</span>
        <span />
      </div>

      {items.map((item, idx) => (
        <div
          key={item.id}
          className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-100 bg-neutral-50/50 p-2.5 sm:grid-cols-[1fr_72px_64px_128px_112px_36px] sm:items-center sm:border-0 sm:bg-transparent sm:p-0"
        >
          <div className="col-span-2 sm:col-span-1">
            <Input
              value={item.name}
              onChange={(e) => update(item.id, { name: e.target.value })}
              placeholder={`品目 ${idx + 1}（例：システムキッチン工事一式）`}
            />
          </div>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={item.quantity}
            onChange={(e) => update(item.id, { quantity: Number(e.target.value) || 0 })}
            className="text-right tnum"
            aria-label="数量"
          />
          <Input
            value={item.unit}
            onChange={(e) => update(item.id, { unit: e.target.value })}
            placeholder="単位"
            aria-label="単位"
          />
          <MoneyInput value={item.unitPrice} onChange={(v) => update(item.id, { unitPrice: v })} />
          <div className="flex items-center justify-end">
            <span className="tnum text-sm font-bold text-neutral-800">{yen(item.amount)}</span>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => remove(item.id)}
              disabled={items.length <= 1}
              className="rounded-md p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 cursor-pointer"
              aria-label="行を削除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <Button variant="secondary" size="sm" onClick={() => onChange([...items, newLineItem()])}>
        <Plus className="h-3.5 w-3.5" />
        行を追加
      </Button>
    </div>
  );
}
