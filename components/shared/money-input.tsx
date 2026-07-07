"use client";

import { useEffect, useState } from "react";
import { parseAmount, withCommas } from "@/lib/shared/format";
import { cn } from "@/lib/shared/utils";

interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/** 金額入力（スマホでテンキー表示・カンマ自動整形） */
export function MoneyInput({ value, onChange, placeholder = "0", className, autoFocus }: MoneyInputProps) {
  const [text, setText] = useState(withCommas(value));

  useEffect(() => {
    // 外部からの値変更（OCR反映など）を取り込む
    setText(withCommas(value));
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-400">
        ¥
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoFocus={autoFocus}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          onChange(parseAmount(raw));
        }}
        onBlur={() => setText(withCommas(parseAmount(text)))}
        className="h-11 w-full rounded-lg border border-neutral-300 bg-white pl-7 pr-3 text-right text-base font-semibold tnum text-neutral-900 shadow-sm placeholder:text-neutral-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
    </div>
  );
}
