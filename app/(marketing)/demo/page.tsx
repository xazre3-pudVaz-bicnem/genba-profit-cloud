import type { Metadata } from "next";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  Info,
  JapaneseYen,
  MonitorPlay,
  Package,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { MockDashboard } from "@/components/marketing/mocks";
import { Reveal } from "@/components/marketing/reveal";
import { Button } from "@/components/shared/button";
import { APP_NAME } from "@/lib/shared/config";
import { appAuthUrl, appDemoUrl } from "@/lib/shared/urls";

export const metadata: Metadata = {
  title: "デモを試す",
  description: `${APP_NAME}のデモ紹介。登録不要でサンプルデータ入りのデモ管理画面を開けます。案件別の利益確認・レシート読み取り・見積請求書の確認を体験してください。`,
  alternates: { canonical: "/demo" },
};

const TRYABLE = [
  { icon: JapaneseYen, title: "案件別の利益確認", body: "売上・原価・粗利・利益率を案件ごとに確認。赤字案件の警告表示も見られます。" },
  { icon: Camera, title: "レシート読み取り", body: "写真をアップロードすると、AIが金額・日付・取引先を読み取る流れを体験できます。" },
  { icon: Package, title: "材料費登録", body: "読み取った内容を確認して保存すると、案件の材料費に即反映されます。" },
  { icon: Wallet, title: "未請求・未入金確認", body: "請求漏れ・入金待ちがダッシュボードでどう見えるかを確認できます。" },
  { icon: FileText, title: "見積・請求書の確認", body: "A4帳票のプレビューとPDF出力の操作感を確認できます。" },
];

export default function DemoPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-neutral-100 bg-surface py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_0%,rgba(249,115,22,0.07),transparent)]" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-xs font-bold tracking-widest text-brand-600">DEMO</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              1分でわかる、{APP_NAME}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-neutral-500">
              サンプルの工事案件・レシート・請求書が入ったデモ管理画面をご用意しました。
              まずは触って、現場の収支が「見える」感覚を確かめてください。
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href={appDemoUrl()}>
                <Button size="lg" className="shadow-lg shadow-brand-600/25">
                  <MonitorPlay className="h-5 w-5" />
                  デモ管理画面を開く
                </Button>
              </Link>
              <Link href={appAuthUrl("/signup")}>
                <Button size="lg" variant="secondary">
                  無料で始める
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-neutral-400">
              登録不要・クレジットカード不要
            </p>
          </Reveal>
        </div>
      </section>

      {/* デモで試せること */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <MockDashboard />
            </Reveal>
            <div>
              <Reveal>
                <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">デモで試せること</h2>
              </Reveal>
              <div className="mt-6 space-y-5">
                {TRYABLE.map((p, i) => (
                  <Reveal key={p.title} delay={i * 0.06}>
                    <div className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                        <p.icon className="h-5 w-5 text-brand-600" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-neutral-900">{p.title}</p>
                        <p className="mt-1 text-xs leading-6 text-neutral-500">{p.body}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 注意書き + CTA */}
      <section className="border-t border-neutral-100 bg-surface py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
              <p className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                <Info className="h-4 w-4 text-neutral-400" />
                デモモードについて
              </p>
              <ul className="mt-4 space-y-2.5">
                {[
                  "デモデータはお使いのブラウザ内のみで動作し、サーバーには保存されません",
                  "実際のAI OCR（レシート読み取り）は本番環境でご利用いただけます（デモではサンプル解析）",
                  "今はサンプルデータで操作感をご確認いただけます。本番利用はデモ画面からいつでも開始できます",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-xs leading-6 text-neutral-600">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={appDemoUrl()}>
              <Button size="lg">
                <MonitorPlay className="h-5 w-5" />
                デモ管理画面を開く
              </Button>
            </Link>
            <Link href={appAuthUrl("/signup")}>
              <Button size="lg" variant="secondary">
                無料で始める
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
