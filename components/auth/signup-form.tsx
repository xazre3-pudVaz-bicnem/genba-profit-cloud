"use client";

import { Info, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Field } from "@/components/shared/label";
import { toast } from "@/components/shared/toast";
import { appPath } from "@/lib/app/routes";
import { setSession, startDemoSession, updateCompany } from "@/lib/app/store";
import { getSupabase, isSupabaseConfigured } from "@/lib/app/supabase";
import { appAuthUrl } from "@/lib/shared/urls";

export function SignupForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  const signup = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    if (!companyName.trim() || !name.trim() || !email.trim() || password.length < 8) {
      toast({
        title: "入力内容を確認してください",
        description: "パスワードは8文字以上で入力してください",
        variant: "error",
      });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, company_name: companyName } },
    });
    if (error) {
      setLoading(false);
      toast({ title: "登録に失敗しました", description: error.message, variant: "error" });
      return;
    }

    if (data.session) {
      // 会社・プロフィールを作成（RLS: 本人のみ作成可能）
      try {
        const { data: companyRow } = await supabase
          .from("companies")
          .insert({ name: companyName })
          .select("id")
          .single();
        if (companyRow) {
          await supabase.from("profiles").insert({
            id: data.session.user.id,
            company_id: companyRow.id,
            name,
            email,
            role: "owner",
          });
        }
      } catch {
        // 初期化失敗時もログイン自体は継続
      }
      setSession({ name, email, role: "owner", mode: "supabase" });
      updateCompany({ name: companyName });
      setLoading(false);
      toast({ title: "アカウントを作成しました" });
      router.push(appPath());
    } else {
      setLoading(false);
      toast({
        title: "確認メールを送信しました",
        description: "メール内のリンクをクリックして登録を完了してください",
      });
    }
  };

  const demo = () => {
    startDemoSession();
    toast({ title: "デモモードで開始しました", description: "サンプルデータで全機能を試せます" });
    router.push(appPath());
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-neutral-900">無料で始める</h1>
      <p className="mt-1 text-xs text-neutral-500">
        すでにアカウントをお持ちの方は{" "}
        <Link href={appAuthUrl("/login")} className="font-medium text-brand-600 hover:underline">
          ログイン
        </Link>
      </p>

      <div className="mt-6 space-y-4">
        {configured ? (
          <>
            <Field label="会社名・屋号" required>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="例：株式会社〇〇工務店"
              />
            </Field>
            <Field label="お名前" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：山田 太郎" />
            </Field>
            <Field label="メールアドレス" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
            <Field label="パスワード（8文字以上）" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
            <Button className="w-full" size="lg" onClick={signup} disabled={loading}>
              <UserPlus className="h-4 w-4" />
              {loading ? "作成中…" : "アカウントを作成"}
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
              Supabaseが未設定のため、アカウント登録は無効です。
              デモモードですべての機能をお試しいただけます。
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
      </div>
    </div>
  );
}
