import { yen } from "@/lib/shared/format";
import { cn } from "@/lib/shared/utils";

interface CurrencyTextProps {
  value: number;
  /** マイナスを赤字表示する */
  colorBySign?: boolean;
  /** 0を「—」で表示する */
  dashZero?: boolean;
  className?: string;
}

/** 金額表示（¥1,234,567形式・等幅数字）。LP/アプリ共用 */
export function CurrencyText({ value, colorBySign, dashZero, className }: CurrencyTextProps) {
  if (dashZero && value === 0) {
    return <span className={cn("tnum text-neutral-300", className)}>—</span>;
  }
  return (
    <span
      className={cn(
        "tnum font-medium",
        colorBySign && value < 0 ? "text-red-600" : "text-neutral-800",
        className
      )}
    >
      {yen(value)}
    </span>
  );
}
