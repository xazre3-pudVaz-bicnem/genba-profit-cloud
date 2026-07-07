"use client";

import { Info, LogIn, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Field } from "@/components/shared/label";
import { toast } from "@/components/shared/toast";
import { appPath } from "@/lib/app/routes";
import { setSession, startDemoSession } from "@/lib/app/store";
import { getSupabase, isSupabaseConfigured } from "@/lib/app/supabase";
import { appAuthUrl } from "@/lib/shared/urls";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  const login = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error || !data.session) {
      toast({ title: "ログインに失敗しました", description: error?.message, variant: "error" });
      return;
    }
    setSession({
      name: (data.session.user.user_metadata?.name as string) || email,
      email,
      role: "owner",
      mode: "supabase",
    });
    router.push(appPath());
  };

  const demo = () => {
    startDemoSession();
    toast({ title: "デモモードでログインしました", description: "サンプルデータで全機能を試せます" });
    router.push(appPath());
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-neutral-900">ログイン</h1>
      <p className="mt-1 text-xs text-neutral-500">
        アカウントをお持ちでない方は{" "}
        <Link href={appAuthUrl("/signup")} className="font-medium text-brand-600 hover:underline">
          新規登録
        </Link>
      </p>

      <div className="mt-6 space-y-4">
        {configured ? (
          <>
            <Field label="メールアドレス">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
            <Field label="パスワード">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void login();
                }}
              />
            </Field>
            <Button className="w-full" size="lg" onClick={login} disabled={loading}>
              <LogIn className="h-4 w-4" />
              {loading ? "ログイン中…" : "ログイン"}
            </Button>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-neutral-200" />
              <span className="text-[10px] text-neutral-400">または</span>
              <span className="h-px flex-1 bg-neutral-200" />
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
            <p className="text-xs leading-5 text-sky-800">
              Supabaseが未設定のため、メールログインは無効です。
              下のデモモードですべての機能をお試しいただけます。
            </p>
          </div>
        )}

        <Button
          variant={configured ? "secondary" : "primary"}
          className="w-full"
          size="lg"
          onClick={demo}
        >
          <Sparkles className="h-4 w-4" />
          デモモードで試す（登録不要）
        </Button>
        <p className="text-center text-[11px] leading-4 text-neutral-400">
          デモデータはお使いのブラウザ内にのみ保存されます
        </p>
      </div>
    </div>
  );
}
