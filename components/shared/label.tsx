import { cn } from "@/lib/shared/utils";

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-medium text-neutral-600", className)}
      {...props}
    >
      {children}
      {required ? <span className="ml-0.5 text-red-500">*</span> : null}
    </label>
  );
}

/** フォームの1項目（ラベル + 入力欄） */
export function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label required={required}>{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-neutral-400">{hint}</p> : null}
    </div>
  );
}
