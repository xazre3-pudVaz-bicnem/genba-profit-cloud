import { formatDate, longDate, shortDate } from "@/lib/shared/format";
import { cn } from "@/lib/shared/utils";

interface DateTextProps {
  value: string | null | undefined;
  /** short: "7/6" / long: "2026年7月6日" / 省略時: "2026/07/06" */
  variant?: "short" | "long" | "default";
  className?: string;
}

/** 日付表示の共通コンポーネント。LP/アプリ共用 */
export function DateText({ value, variant = "default", className }: DateTextProps) {
  const text =
    variant === "short" ? shortDate(value) : variant === "long" ? longDate(value) : formatDate(value);
  return <span className={cn("tnum", className)}>{text}</span>;
}
