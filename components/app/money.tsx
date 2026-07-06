import { yen } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MoneyProps {
  value: number;
  /** マイナスを赤字表示する */
  colorBySign?: boolean;
  /** 0を「—」で表示する */
  dashZero?: boolean;
  className?: string;
}

/** 金額表示（テーブル・一覧用。等幅数字） */
export function Money({ value, colorBySign, dashZero, className }: MoneyProps) {
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
