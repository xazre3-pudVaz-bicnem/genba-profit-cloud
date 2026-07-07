import { cn } from "@/lib/shared/utils";

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-max text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-neutral-200 bg-neutral-50/60">{children}</tr>
    </thead>
  );
}

export function TH({
  className,
  align,
  children,
}: {
  className?: string;
  align?: "right" | "center";
  children?: React.ReactNode;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-neutral-100">{children}</tbody>;
}

export function TR({
  className,
  onClick,
  children,
}: {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(onClick && "cursor-pointer transition-colors hover:bg-brand-50/40", className)}
    >
      {children}
    </tr>
  );
}

export function TD({
  className,
  align,
  children,
}: {
  className?: string;
  align?: "right" | "center";
  children?: React.ReactNode;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-3 py-3 align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      {children}
    </td>
  );
}
