"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/shared/button";

// ============================================================
// アプリ全体のエラー画面（画面を真っ白にしない最終防衛線）
// ============================================================

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] 予期しないエラー:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <TriangleAlert className="h-7 w-7 text-red-500" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-neutral-900">エラーが発生しました</h1>
        <p className="mt-2 text-xs leading-6 text-neutral-500">
          通信に失敗したか、一時的な問題が発生しています。
          <br />
          時間をおいて再度お試しください。入力済みのデータは保存されています。
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            もう一度読み込む
          </Button>
          <Link href="/">
            <Button variant="secondary" className="w-full sm:w-auto">
              トップページへ戻る
            </Button>
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-4 text-[10px] text-neutral-300">エラーコード: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
