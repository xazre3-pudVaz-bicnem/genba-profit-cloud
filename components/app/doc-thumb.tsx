/* eslint-disable @next/next/no-img-element */
import {
  FileCheck2,
  FileInput,
  FileSpreadsheet,
  FileText,
  Receipt,
  ReceiptText,
  ScrollText,
} from "lucide-react";
import type { DocumentRec, DocumentType } from "@/lib/app/types";
import { cn } from "@/lib/shared/utils";

const TYPE_ICONS: Record<DocumentType, typeof Receipt> = {
  receipt: Receipt,
  receipt_official: ReceiptText,
  invoice: FileText,
  estimate: FileSpreadsheet,
  purchase_order: FileInput,
  delivery_note: FileCheck2,
  other: ScrollText,
};

const TYPE_TINTS: Record<DocumentType, string> = {
  receipt: "bg-amber-50 text-amber-500",
  receipt_official: "bg-orange-50 text-orange-500",
  invoice: "bg-blue-50 text-blue-500",
  estimate: "bg-violet-50 text-violet-500",
  purchase_order: "bg-indigo-50 text-indigo-500",
  delivery_note: "bg-teal-50 text-teal-500",
  other: "bg-neutral-100 text-neutral-500",
};

/**
 * 書類サムネイル。画像がある場合は表示し、
 * ない場合（デモデータ等）は書類風のプレースホルダを描画する
 */
export function DocThumb({ doc, className }: { doc: DocumentRec; className?: string }) {
  if (doc.thumbnailUrl) {
    return (
      <div className={cn("overflow-hidden rounded-lg border border-neutral-200 bg-white", className)}>
        <img src={doc.thumbnailUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  const Icon = TYPE_ICONS[doc.documentType];
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-gradient-to-b from-white to-neutral-50 p-2",
        className
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md",
          TYPE_TINTS[doc.documentType]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="w-full space-y-1 px-1.5">
        <div className="h-1 w-full rounded bg-neutral-200/80" />
        <div className="h-1 w-3/4 rounded bg-neutral-200/60" />
        <div className="h-1 w-5/6 rounded bg-neutral-200/40" />
      </div>
    </div>
  );
}
