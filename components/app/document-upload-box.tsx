"use client";

import { Camera, ImagePlus } from "lucide-react";
import { Card } from "@/components/shared/card";
import { toast } from "@/components/shared/toast";
import { DOCUMENT_ACCEPT, validateDocumentFile } from "@/lib/app/upload";

interface DocumentUploadBoxProps {
  onFile: (file: File) => void;
}

/** 書類の撮影・選択・ドラッグ&ドロップ受付ボックス */
export function DocumentUploadBox({ onFile }: DocumentUploadBoxProps) {
  const handle = (file: File | undefined | null) => {
    if (!file) return;
    const invalid = validateDocumentFile(file);
    if (invalid) {
      toast({ title: invalid, variant: "error" });
      return;
    }
    onFile(file);
  };

  return (
    <Card className="p-5 sm:p-8">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handle(e.dataTransfer.files?.[0]);
        }}
        className="flex flex-col items-center gap-5 rounded-2xl border-2 border-dashed border-neutral-200 px-4 py-10 text-center"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50">
          <Camera className="h-8 w-8 text-brand-600" />
        </span>
        <div>
          <p className="text-base font-bold text-neutral-900">写真・PDF・Excelを追加してください</p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            レシート・領収書・請求書は写真で、明細データはExcel・CSVでも読み込めます。
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2.5">
          <label className="w-full cursor-pointer">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handle(e.target.files?.[0])}
            />
            <span className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-base font-bold text-white shadow-sm transition-colors hover:bg-brand-700">
              <Camera className="h-5 w-5" />
              カメラで撮る
            </span>
          </label>
          <label className="w-full cursor-pointer">
            <input
              type="file"
              accept={DOCUMENT_ACCEPT}
              className="hidden"
              onChange={(e) => handle(e.target.files?.[0])}
            />
            <span className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white text-base font-bold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50">
              <ImagePlus className="h-5 w-5" />
              ファイルを選ぶ
            </span>
          </label>
        </div>
        <p className="text-[11px] text-neutral-400">
          jpg / png / webp / pdf / xlsx / xls / csv・10MBまで
          <br className="sm:hidden" />
          <span className="hidden sm:inline">・</span>ここにファイルをドラッグ&ドロップ
        </p>
      </div>
    </Card>
  );
}
