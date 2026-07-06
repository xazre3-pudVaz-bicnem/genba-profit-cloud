import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** ブランドマーク（屋根 + 上昇する収支バー） */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm",
        className ?? "h-8 w-8"
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[64%] w-[64%]" aria-hidden>
        <path
          d="M4 9.5L12 4L20 9.5"
          stroke="white"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 19.5V15.5" stroke="white" strokeWidth={2.4} strokeLinecap="round" />
        <path d="M12 19.5V13" stroke="white" strokeWidth={2.4} strokeLinecap="round" />
        <path d="M16 19.5V10.5" stroke="white" strokeWidth={2.4} strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function BrandLogo({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BrandMark className={size === "lg" ? "h-9 w-9" : size === "sm" ? "h-7 w-7" : "h-8 w-8"} />
      <span
        className={cn(
          "font-bold tracking-tight text-neutral-900",
          size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base"
        )}
      >
        {APP_NAME}
      </span>
    </span>
  );
}
