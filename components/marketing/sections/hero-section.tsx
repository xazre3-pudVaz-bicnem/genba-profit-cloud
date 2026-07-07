import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { FloatingCards, MockDashboard } from "@/components/marketing/mocks";
import { Reveal } from "@/components/marketing/reveal";
import { Button } from "@/components/shared/button";
import { signupUrl } from "@/lib/urls";

/** LPヒーロー */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_10%,rgba(249,115,22,0.08),transparent)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              建設・現場仕事のための収支管理SaaS
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-5 text-4xl font-bold leading-[1.2] tracking-tight text-neutral-900 sm:text-5xl">
              建設現場の利益管理を、
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
                もっと簡単に。
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 max-w-xl text-sm leading-7 text-neutral-600 sm:text-base sm:leading-8">
              案件ごとの売上・材料費・外注費・経費を一元管理。
              レシートや請求書を写真でアップロードするだけで、利益と利益率を自動計算します。
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href={signupUrl()}>
                <Button size="lg" className="shadow-lg shadow-brand-600/25">
                  無料で試す
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="secondary">
                  デモを見る
                </Button>
              </Link>
              <Link
                href={signupUrl()}
                className="text-sm font-medium text-neutral-500 underline-offset-4 hover:text-brand-600 hover:underline"
              >
                資料請求
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.32}>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {["登録は3タップ・約10秒", "赤字案件を自動警告", "スマホだけで完結"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.2} className="relative">
          <div className="relative lg:rotate-1 lg:scale-105">
            <MockDashboard />
            <FloatingCards />
          </div>
        </Reveal>
      </div>

      {/* 業種ストリップ */}
      <div className="relative border-t border-neutral-100 bg-neutral-50/60">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <p className="text-center text-[11px] font-medium text-neutral-400">
            内装・リフォーム・設備・電気・外構・水道・原状回復・工務店 — あらゆる現場仕事に
          </p>
        </div>
      </div>
    </section>
  );
}
