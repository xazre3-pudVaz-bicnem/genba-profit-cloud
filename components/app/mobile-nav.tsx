"use client";

import { Camera, Files, FolderKanban, Home, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand";
import { useSession } from "@/lib/store";
import { cn } from "@/lib/utils";

/** スマホ用の上部バー */
export function MobileTopBar() {
  const session = useSession();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/90 px-4 backdrop-blur lg:hidden no-print">
      <Link href="/app">
        <BrandLogo size="sm" />
      </Link>
      {session?.mode === "demo" ? (
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700">
          デモモード
        </span>
      ) : null}
    </header>
  );
}

const ITEMS = [
  { href: "/app", label: "ホーム", icon: Home },
  { href: "/app/projects", label: "案件", icon: FolderKanban },
  { href: "/app/documents/upload", label: "写真登録", icon: Camera, fab: true },
  { href: "/app/documents", label: "書類", icon: Files },
  { href: "/app/settings", label: "設定", icon: Settings },
] as const;

/** スマホ下部の固定ナビ（中央は写真登録の大ボタン） */
export function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/app") return pathname === "/app";
    if (href === "/app/documents") {
      return pathname.startsWith("/app/documents") && !pathname.startsWith("/app/documents/upload");
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
          if ("fab" in item && item.fab) {
            return (
              <Link key={item.href} href={item.href} className="relative flex flex-col items-center justify-end pb-1.5">
                <span
                  className={cn(
                    "absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg shadow-brand-600/30 transition-transform active:scale-95",
                    "bg-gradient-to-br from-brand-500 to-brand-700"
                  )}
                >
                  <Camera className="h-6 w-6" />
                </span>
                <span className={cn("text-[10px] font-semibold", active ? "text-brand-700" : "text-neutral-500")}>
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
