"use client";

import { Camera, Files, FolderKanban, Home, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { appPath } from "@/lib/app/routes";
import { cn } from "@/lib/shared/utils";

const ITEMS = [
  { href: appPath(), label: "ホーム", icon: Home, fab: false },
  { href: appPath("/projects"), label: "案件", icon: FolderKanban, fab: false },
  { href: appPath("/documents/upload"), label: "写真登録", icon: Camera, fab: true },
  { href: appPath("/documents"), label: "書類", icon: Files, fab: false },
  { href: appPath("/settings"), label: "設定", icon: Settings, fab: false },
];

/** スマホ下部の固定ナビ（中央は写真登録の大ボタン）。アプリ専用 */
export function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === appPath()) return pathname === appPath();
    if (href === appPath("/documents")) {
      return (
        pathname.startsWith(appPath("/documents")) &&
        !pathname.startsWith(appPath("/documents/upload"))
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur lg:hidden no-print"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid h-16 grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          if (item.fab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-end pb-1.5"
              >
                <span className="absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30 transition-transform active:scale-95">
                  <Camera className="h-6 w-6" />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold",
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
              className="flex flex-col items-center justify-center gap-0.5"
            >
              <item.icon
                className={cn("h-[22px] w-[22px]", active ? "text-brand-600" : "text-neutral-400")}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  active ? "font-semibold text-brand-700" : "text-neutral-500"
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
