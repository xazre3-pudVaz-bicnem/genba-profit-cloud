"use client";

import { Camera, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/shared/button";
import { appPath } from "@/lib/app/routes";
import { signOutEverywhere, useDB, useSession } from "@/lib/app/data-store";
import { marketingUrl, signupUrl } from "@/lib/urls";

/** アプリ専用ヘッダー（デモモード表示・クイック操作・ユーザーメニュー） */
export function AppHeader() {
  const router = useRouter();
  const session = useSession();
  const db = useDB();
  const isDemo = session?.mode === "demo";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur lg:px-6 no-print">
      {/* 左: モバイルはロゴ / PCは会社名 */}
      <div className="flex min-w-0 items-center gap-3">
        <Link href={appPath("/documents/upload")} className="lg:hidden">
          <Logo size="sm" />
        </Link>
        <p className="hidden truncate text-sm font-bold text-neutral-800 lg:block">
          {db.company.name || "管理画面"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isDemo ? (
          <>
            <span className="hidden rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700 sm:inline-block">
              デモモード
            </span>
            <Link href={signupUrl()}>
              <Button variant="secondary" size="sm" className="text-xs">
                本番利用を開始する
              </Button>
            </Link>
          </>
        ) : null}

        <Link href={appPath("/documents/upload")} className="hidden lg:block">
          <Button size="sm">
            <Camera className="h-3.5 w-3.5" />
            写真から登録
          </Button>
        </Link>

        {session ? (
          <div className="flex items-center gap-1.5 border-l border-neutral-200 pl-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
              {session.name.slice(0, 1)}
            </span>
            <span className="hidden max-w-[120px] truncate text-xs font-semibold text-neutral-700 md:block">
              {session.name}
            </span>
            <button
              type="button"
              onClick={async () => {
                await signOutEverywhere();
                router.replace(marketingUrl("/"));
              }}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
              aria-label="ログアウト"
              title="ログアウト"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
