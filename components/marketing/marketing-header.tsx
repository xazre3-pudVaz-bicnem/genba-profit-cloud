"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/shared/button";
import { loginUrl, signupUrl } from "@/lib/urls";

const NAV = [
  { href: "/features", label: "機能" },
  { href: "/pricing", label: "料金" },
  { href: "/demo", label: "デモ" },
];

/** LP専用ヘッダー（アプリ側では使用しない） */
export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/60 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href={loginUrl()}>
            <Button variant="ghost">ログイン</Button>
          </Link>
          <Link href={signupUrl()}>
            <Button>無料で試す</Button>
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 md:hidden cursor-pointer"
          onClick={() => setOpen((v) => !v)}
          aria-label="メニュー"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-neutral-100 bg-white px-4 py-3 md:hidden">
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3">
            <Link href={loginUrl()} onClick={() => setOpen(false)}>
              <Button variant="secondary" className="w-full">
                ログイン
              </Button>
            </Link>
            <Link href={signupUrl()} onClick={() => setOpen(false)}>
              <Button className="w-full">無料で試す</Button>
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
