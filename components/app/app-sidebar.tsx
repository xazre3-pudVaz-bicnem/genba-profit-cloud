"use client";

import { Camera, FolderKanban, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { appPath } from "@/lib/app/routes";
import { cn } from "@/lib/shared/utils";

// ============================================================
// アプリ専用サイドバー（PCのみ表示）
// 現場ユーザーが迷わないよう3項目のみ。写真登録が最重要導線。
// 売上・原価・見積・請求・書類一覧などの管理ページは
// 設定・案件詳細からアクセスする（機能自体は維持）。
// ============================================================

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { href: appPath("/projects"), label: "案件一覧", icon: FolderKanban },
  { href: appPath("/settings"), label: "設定", icon: Settings },
];

const UPLOAD_HREF = appPath("/documents/upload");

export function AppSidebar() {
  const pathname = usePathname();
  const uploadActive = pathname.startsWith(UPLOAD_HREF);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-neutral-200 bg-white lg:flex no-print">
      <div className="flex h-14 items-center border-b border-neutral-100 px-5">
        <Link href={UPLOAD_HREF}>
          <Logo size="sm" />
        </Link>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
        {/* 最重要導線: 写真登録 */}
        <Link
          href={UPLOAD_HREF}
          className={cn(
            "flex items-center gap-3 rounded-xl bg-brand-600 px-4 py-3.5 text-[15px] font-bold text-white shadow-sm shadow-brand-600/25 transition-all hover:bg-brand-700",
            uploadActive && "ring-2 ring-brand-300 ring-offset-2"
          )}
        >
          <Camera className="h-5 w-5" />
          写真登録
        </Link>

        <div className="pt-2" />

        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-semibold transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              )}
            >
              <item.icon
                className={cn("h-5 w-5", active ? "text-brand-600" : "text-neutral-400")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
