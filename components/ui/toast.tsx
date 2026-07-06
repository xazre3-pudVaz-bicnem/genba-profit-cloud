"use client";

import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastInput {
  id: number;
}

let pushImpl: ((t: ToastInput) => void) | null = null;
let seq = 0;

/** どこからでも呼べるトースト通知 */
export function toast(input: ToastInput) {
  pushImpl?.(input);
}

const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const ICON_COLORS: Record<ToastVariant, string> = {
  success: "text-emerald-400",
  error: "text-red-400",
  info: "text-sky-400",
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    pushImpl = (input) => {
      const id = ++seq;
      setItems((prev) => [...prev.slice(-3), { ...input, id }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    };
    return () => {
      pushImpl = null;
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end no-print"
    >
      {items.map((item) => {
        const variant = item.variant ?? "success";
        const Icon = ICONS[variant];
        return (
          <div
            key={item.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-neutral-900 px-4 py-3 text-white shadow-pop animate-toast-in"
          >
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", ICON_COLORS[variant])} />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-5">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-xs leading-4 text-neutral-300">{item.description}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
