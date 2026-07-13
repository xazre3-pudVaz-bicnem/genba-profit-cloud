"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/shared/logo";
import {
  getSession,
  hydrateFromSupabase,
  setSession,
  startDemoSession,
} from "@/lib/app/data-store";
import { getSupabase } from "@/lib/app/supabase";
import type { Role } from "@/lib/app/types";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { MobileBottomNav } from "./mobile-nav";

/**
 * アプリ全体のシェル（LPとは完全分離）。
 * - `?demo=true` は最優先で必ずデモモード（demoStore）で開く
 * - 認証チェック（デモセッション or Supabaseセッション）
 * - supabaseモードで入場したらDBからデータをhydrateする
 * - 未ログインなら /login へリダイレクト
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const wantsDemo =
        new URLSearchParams(window.location.search).get("demo") === "true";

      try {
        // 1. ?demo=true → 必ずデモセッションで開く（既存のSupabaseセッションよりも優先）
        if (wantsDemo) {
          if (getSession()?.mode !== "demo") startDemoSession();
          if (!cancelled) setReady(true);
          return;
        }
        // 2. ローカルセッション（デモ or 前回ログイン）
        const existing = getSession();
        if (existing) {
          if (existing.mode === "supabase") void hydrateFromSupabase();
          if (!cancelled) setReady(true);
          return;
        }
        // 3. Supabaseセッション（接続不良で固まらないよう4秒でタイムアウト）
        const supabase = getSupabase();
        if (supabase) {
          const result = await Promise.race([
            supabase.auth.getSession(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
          ]);
          const session = result && "data" in result ? result.data.session : null;
          if (session && !cancelled) {
            // 実ロールを先に取得（staff/viewerに管理UIを一瞬でも見せない）。
            // 取得失敗時はownerで開始し、hydrateFromSupabaseが後追いで補正する
            let role: Role = "owner";
            try {
              const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", session.user.id)
                .maybeSingle();
              if (profile?.role) role = profile.role as Role;
            } catch {
              // ignore
            }
            setSession({
              name:
                (session.user.user_metadata?.name as string) ||
                session.user.email ||
                "ユーザー",
              email: session.user.email ?? "",
              role,
              mode: "supabase",
            });
            void hydrateFromSupabase();
            setReady(true);
            return;
          }
        }
        if (!cancelled) router.replace("/login");
      } catch {
        // 想定外のエラーでも「読み込み中」のまま止めない
        if (cancelled) return;
        if (wantsDemo) {
          startDemoSession();
          setReady(true);
        } else {
          router.replace("/login");
        }
      }
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
