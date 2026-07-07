import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/shared/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100">
        <Icon className="h-6 w-6 text-neutral-400" />
      </div>
      <p className="mt-4 text-sm font-bold text-neutral-800">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
