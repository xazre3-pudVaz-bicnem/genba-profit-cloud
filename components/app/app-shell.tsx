"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/shared/logo";
import { getSession, setSession, startDemoSession } from "@/lib/app/store";
import { getSupabase } from "@/lib/app/supabase";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { MobileBottomNav } from "./mobile-nav";

/**
 * アプリ全体のシェル（LPとは完全分離）。
 * - 認証チェック（デモセッション or Supabaseセッション）
 * - `?demo=true` で開かれた場合はデモセッションを自動開始
 * - 未ログインなら /login へリダイレクト
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
      // 2. ?demo=true → デモセッションを自動開始（LPの「デモ管理画面を開く」導線）
      const params = new URLSearchParams(window.location.search);
      if (params.get("demo") === "true") {
        startDemoSession();
        if (!cancelled) setReady(true);
        return;
      }
      // 3. Supabaseセッション
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session && !cancelled) {
          setSession({
            name:
              (data.session.user.user_metadata?.name as string) ||
              data.session.user.email ||
              "ユーザー",
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
      <AppSidebar />
      <div className="pb-24 lg:pb-0 lg:pl-60">
        <AppHeader />
        <main className="min-h-[calc(100dvh-3.5rem)]">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
