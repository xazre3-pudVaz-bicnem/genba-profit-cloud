import { ChevronDown } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/shared/utils";

/** ネイティブselect（スマホで最も使いやすいピッカーを優先） */
export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className={cn("relative", className)}>
    <select
      ref={ref}
      className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-neutral-300 bg-white pl-3 pr-9 text-sm text-neutral-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-neutral-50"
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
  </div>
));
Select.displayName = "Select";
