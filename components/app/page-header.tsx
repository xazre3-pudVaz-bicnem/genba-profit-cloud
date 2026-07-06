import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** ページの共通コンテナ */
export function PageContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "戻る",
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-5", className)}>
      {backHref ? (
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-0.5 text-xs font-medium text-neutral-500 hover:text-neutral-800"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-neutral-500 sm:text-sm">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
