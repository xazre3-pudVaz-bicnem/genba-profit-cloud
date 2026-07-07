"use client";

import { Info, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Field } from "@/components/shared/label";
import { toast } from "@/components/shared/toast";
import { appPath } from "@/lib/app/routes";
import {
  hydrateFromSupabase,
  setSession,
  startDemoSession,
  updateCompany,
} from "@/lib/app/data-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/app/supabase";
import { getPlan } from "@/lib/billing/plans";
import { appAuthUrl } from "@/lib/shared/urls";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 料金ページから /signup?plan=standard の形式で引き継ぐ（Stripe接続時に使用）
  const selectedPlan = getPlan(searchParams.get("plan"));
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
      // plan はStripe課金の接続時に初期プランとして使用する
      options: { data: { name, company_name: companyName, plan: selectedPlan?.id ?? null } },
    });
    if (error) {
      setLoading(false);
      toast({ title: "登録に失敗しました", description: error.message, variant: "error" });
      return;
    }

    if (data.session) {
      // 会社・プロフィールの作成は hydrateFromSupabase → ensureCompanyId が
      // user_metadata（company_name / name）をもとに自動で行う
      setSession({ name, email, role: "owner", mode: "supabase" });
      updateCompany({ name: companyName });
      void hydrateFromSupabase();
      setLoading(false);
      toast({ title: "アカウントを作成しました" });
      router.push(appPath());
    } else {
      setLoading(false);
      toast({
        title: "確認メールを送信しました",
        description:
          "メール内のリンクで確認後、ログインしてください。会社情報は初回ログイン時に自動作成されます",
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

      {selectedPlan ? (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
          <div>
            <p className="text-xs font-bold text-brand-800">{selectedPlan.name}プランを選択中</p>
            <p className="mt-0.5 text-[11px] text-brand-700">
              月額 ¥{selectedPlan.price.toLocaleString("ja-JP")}（税別）・14日間無料トライアル
            </p>
          </div>
          <Link href="/pricing" className="text-[11px] font-medium text-brand-600 hover:underline">
            変更
          </Link>
        </div>
      ) : null}

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
