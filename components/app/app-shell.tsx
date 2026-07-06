"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand";
import { getSession, setSession } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";
import { MobileBottomNav, MobileTopBar } from "./mobile-nav";
import { Sidebar } from "./sidebar";

/**
 * アプリ全体のシェル。
 * 認証チェック（デモセッション or Supabaseセッション）を行い、
 * 未ログインなら /login へリダイレクトする。
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // 1. ローカルセッション（デモ or 前回ログイン）
      if (getSession()) {
        if (!cancelled) setReady(true);
        return;
      }
      // 2. Supabaseセッション
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session && !cancelled) {
          setSession({
            name: (data.session.user.user_metadata?.name as string) || data.session.user.email || "ユーザー",
            email: data.session.user.email ?? "",
            role: "owner",
            mode: "supabase",
          });
          setReady(true);
          return;
        }
      }
      if (!cancelled) router.replace("/login");
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <BrandMark className="h-12 w-12 animate-pulse" />
          <p className="text-xs text-neutral-400">読み込み中…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface">
      <Sidebar />
      <MobileTopBar />
      <div className="pb-24 lg:pb-0 lg:pl-60">
        <main className="min-h-[calc(100dvh-3.5rem)] lg:min-h-dvh">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
