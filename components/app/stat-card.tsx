import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/shared/utils";

type Tone = "default" | "brand" | "danger" | "warning" | "success";

const VALUE_COLORS: Record<Tone, string> = {
  default: "text-neutral-900",
  brand: "text-brand-700",
  danger: "text-red-600",
  warning: "text-amber-600",
  success: "text-emerald-600",
};

const ICON_COLORS: Record<Tone, string> = {
  default: "bg-neutral-100 text-neutral-500",
  brand: "bg-brand-50 text-brand-600",
  danger: "bg-red-50 text-red-500",
  warning: "bg-amber-50 text-amber-500",
  success: "bg-emerald-50 text-emerald-500",
};

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  icon?: LucideIcon;
  href?: string;
  size?: "lg" | "sm";
  className?: string;
}

/** ダッシュボードのKPIカード */
export function StatCard({
  label,
  value,
  sub,
  tone = "default",
  icon: Icon,
  href,
  size = "lg",
  className,
}: StatCardProps) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white shadow-card transition-shadow",
        href && "hover:shadow-pop hover:border-neutral-300",
        size === "lg" ? "p-4 sm:p-5" : "p-3.5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("font-medium text-neutral-500", size === "lg" ? "text-xs sm:text-[13px]" : "text-[11px]")}>
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg",
              size === "lg" ? "h-8 w-8" : "h-6 w-6",
              ICON_COLORS[tone]
            )}
          >
            <Icon className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} />
          </span>
        ) : null}
      </div>
      <div className={size === "lg" ? "mt-2" : "mt-1.5"}>
        <p
          className={cn(
            "font-bold leading-none tracking-tight",
            size === "lg" ? "text-2xl sm:text-[28px]" : "text-lg",
            VALUE_COLORS[tone]
          )}
        >
          {value}
        </p>
        {sub ? <p className="mt-1.5 text-[11px] leading-4 text-neutral-400">{sub}</p> : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {body}
      </Link>
    );
  }
  return body;
}
