"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { MoneyInput } from "@/components/shared/money-input";
import { uid, yen } from "@/lib/shared/format";
import type { LineItem } from "@/lib/app/types";
import { cn } from "@/lib/shared/utils";

interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

export function newLineItem(): LineItem {
  return { id: uid(), name: "", quantity: 1, unit: "式", unitPrice: 0, amount: 0 };
}

/**
 * 見積書・請求書・発注書の明細行エディタ。
 * 左端のつまみをドラッグすると行の順番を入れ替えられる。
 */
export function LineItemsEditor({ items, onChange }: LineItemsEditorProps) {
  // ドラッグ中の行ID（つまみを掴んだときだけドラッグを許可する）
  const dragId = useRef<string | null>(null);
  const [dragEnabledId, setDragEnabledId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

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

  const moveTo = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIndex = items.findIndex((i) => i.id === fromId);
    const toIndex = items.findIndex((i) => i.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {/* ヘッダー（PCのみ） */}
      <div className="hidden grid-cols-[24px_1fr_72px_64px_128px_112px_36px] gap-2 px-1 text-[10px] font-bold text-neutral-400 sm:grid">
        <span />
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
          draggable={dragEnabledId === item.id}
          onDragStart={(e) => {
            dragId.current = item.id;
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragEnd={() => {
            dragId.current = null;
            setDragEnabledId(null);
            setOverId(null);
          }}
          onDragOver={(e) => {
            if (!dragId.current || dragId.current === item.id) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setOverId(item.id);
          }}
          onDragLeave={() => setOverId((cur) => (cur === item.id ? null : cur))}
          onDrop={(e) => {
            e.preventDefault();
            if (dragId.current) moveTo(dragId.current, item.id);
            dragId.current = null;
            setDragEnabledId(null);
            setOverId(null);
          }}
          className={cn(
            "grid grid-cols-[24px_1fr] gap-2 rounded-xl border border-neutral-100 bg-neutral-50/50 p-2.5 sm:grid-cols-[24px_1fr_72px_64px_128px_112px_36px] sm:items-center sm:border-0 sm:bg-transparent sm:p-0",
            overId === item.id && "ring-2 ring-brand-400/60 rounded-lg",
            dragEnabledId === item.id && "opacity-70"
          )}
        >
          {/* 並び替えつまみ（掴んだ行だけドラッグ可能にする） */}
          <button
            type="button"
            onMouseDown={() => setDragEnabledId(item.id)}
            onTouchStart={() => setDragEnabledId(item.id)}
            className="flex h-full min-h-9 cursor-grab items-center justify-center text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
            aria-label={`行${idx + 1}を並び替え`}
            title="ドラッグで並び替え"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <Input
              value={item.name}
              onChange={(e) => update(item.id, { name: e.target.value })}
              placeholder={`品目 ${idx + 1}（例：システムキッチン工事一式）`}
            />
          </div>
          <div className="col-start-2 grid grid-cols-2 gap-2 sm:col-start-auto sm:contents">
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
        </div>
      ))}

      <Button variant="secondary" size="sm" onClick={() => onChange([...items, newLineItem()])}>
        <Plus className="h-3.5 w-3.5" />
        行を追加
      </Button>
    </div>
  );
}
