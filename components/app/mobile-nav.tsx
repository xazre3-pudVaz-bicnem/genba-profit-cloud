"use client";

import { Camera, FilePlus2, FolderKanban, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { appPath } from "@/lib/app/routes";
import { cn } from "@/lib/shared/utils";

// ============================================================
// スマホ下部の固定ナビ（4項目・写真登録は大ボタンで強調）
// 現場で片手操作できるよう、ボタンは大きめにする
// ============================================================

const UPLOAD_HREF = appPath("/documents/upload");

const ITEMS = [
  { href: appPath("/documents/create"), label: "書類作成", icon: FilePlus2, fab: false },
  { href: UPLOAD_HREF, label: "写真登録", icon: Camera, fab: true },
  { href: appPath("/projects"), label: "案件一覧", icon: FolderKanban, fab: false },
  { href: appPath("/settings"), label: "設定", icon: Settings, fab: false },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur lg:hidden no-print"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid h-[68px] grid-cols-4">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          if (item.fab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-end pb-1.5"
              >
                <span className="absolute -top-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30 transition-transform active:scale-95">
                  <Camera className="h-7 w-7" />
                </span>
                <span
                  className={cn(
                    "text-[11px] font-bold",
                    active ? "text-brand-700" : "text-neutral-500"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1"
            >
              <item.icon
                className={cn("h-6 w-6", active ? "text-brand-600" : "text-neutral-400")}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={cn(
                  "text-[11px] font-medium",
                  active ? "font-bold text-brand-700" : "text-neutral-500"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
