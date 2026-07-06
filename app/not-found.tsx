import Link from "next/link";
import { BrandMark } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-surface px-4 text-center">
      <BrandMark className="h-12 w-12" />
      <div>
        <p className="text-5xl font-bold tracking-tight text-neutral-900">404</p>
        <p className="mt-2 text-sm text-neutral-500">お探しのページは見つかりませんでした</p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          トップページ
        </Link>
        <Link
          href="/app"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          管理画面へ
        </Link>
      </div>
    </div>
  );
}
