"use client";

import {
  CalendarDays,
  Camera,
  FileSpreadsheet,
  FileText,
  Files,
  FolderKanban,
  JapaneseYen,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  SquareKanban,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand";
import { getSupabase } from "@/lib/supabase/client";
import { setSession, useSession } from "@/lib/store";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  highlight?: boolean;
}

interface NavSection {
  title: string | null;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: null,
    items: [
      { href: "/app", label: "ダッシュボード", icon: LayoutDashboard },
      { href: "/app/projects", label: "案件", icon: FolderKanban },
      { href: "/app/projects/board", label: "案件ボード", icon: SquareKanban },
      { href: "/app/calendar", label: "カレンダー", icon: CalendarDays },
    ],
  },
  {
    title: "収支",
    items: [
      { href: "/app/revenues", label: "売上", icon: JapaneseYen },
      { href: "/app/costs", label: "原価", icon: Receipt },
      { href: "/app/estimates", label: "見積書", icon: FileSpreadsheet },
      { href: "/app/invoices", label: "請求書", icon: FileText },
    ],
  },
  {
    title: "書類",
    items: [
      { href: "/app/documents/upload", label: "写真から登録", icon: Camera, highlight: true },
      { href: "/app/documents", label: "書類一覧", icon: Files },
    ],
  },
  {
    title: "管理",
    items: [
      { href: "/app/settings", label: "会社設定", icon: Settings },
      { href: "/app/settings/members", label: "メンバー", icon: Users },
    ],
  },
];

const ALL_HREFS = SECTIONS.flatMap((s) => s.items.map((i) => i.href));

function isActive(pathname: string, href: string): boolean {
  const matches = (h: string) => pathname === h || pathname.startsWith(`${h}/`);
  if (!matches(href)) return false;
  // より長い一致のナビ項目がある場合はそちらを優先する
  return !ALL_HREFS.some((other) => other !== href && other.length > href.length && matches(other));
}

export async function signOutEverywhere() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  setSession(null);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-neutral-200 bg-white lg:flex no-print">
      <div className="flex h-16 items-center border-b border-neutral-100 px-5">
        <Link href="/app">
          <BrandLogo size="sm" />
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section, idx) => (
          <div key={idx}>
            {section.title ? (
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {section.title}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : item.highlight
                          ? "text-brand-700 hover:bg-brand-50"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                    )}
                  >
                    <item.icon
                      className={cn("h-[18px] w-[18px]", active ? "text-brand-600" : item.highlight ? "text-brand-500" : "text-neutral-400")}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-neutral-100 p-3">
        {session ? (
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
              {session.name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-neutral-800">{session.name}</p>
              <p className="text-[10px] text-neutral-400">
                {session.mode === "demo" ? "デモモード" : session.email}
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await signOutEverywhere();
                router.replace("/login");
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
    </aside>
  );
}
