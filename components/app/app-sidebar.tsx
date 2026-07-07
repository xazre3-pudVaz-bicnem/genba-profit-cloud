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
  Receipt,
  Settings,
  SquareKanban,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { appPath } from "@/lib/app/routes";
import { cn } from "@/lib/shared/utils";

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
      { href: appPath(), label: "ダッシュボード", icon: LayoutDashboard },
      { href: appPath("/projects"), label: "案件一覧", icon: FolderKanban },
      { href: appPath("/projects/board"), label: "案件ボード", icon: SquareKanban },
      { href: appPath("/calendar"), label: "カレンダー", icon: CalendarDays },
    ],
  },
  {
    title: "書類",
    items: [
      { href: appPath("/documents/upload"), label: "写真登録", icon: Camera, highlight: true },
      { href: appPath("/documents"), label: "書類一覧", icon: Files },
    ],
  },
  {
    title: "収支",
    items: [
      { href: appPath("/revenues"), label: "売上", icon: JapaneseYen },
      { href: appPath("/costs"), label: "原価", icon: Receipt },
      { href: appPath("/estimates"), label: "見積", icon: FileSpreadsheet },
      { href: appPath("/invoices"), label: "請求", icon: FileText },
    ],
  },
  {
    title: "管理",
    items: [
      { href: appPath("/settings"), label: "設定", icon: Settings },
      { href: appPath("/settings/members"), label: "メンバー", icon: Users },
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

/** アプリ専用サイドバー（PCのみ表示） */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-neutral-200 bg-white lg:flex no-print">
      <div className="flex h-14 items-center border-b border-neutral-100 px-5">
        <Link href={appPath()}>
          <Logo size="sm" />
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
                      className={cn(
                        "h-[18px] w-[18px]",
                        active ? "text-brand-600" : item.highlight ? "text-brand-500" : "text-neutral-400"
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
