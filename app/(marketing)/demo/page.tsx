import type { Metadata } from "next";
import { CheckCircle2, MousePointerClick, ShieldCheck, Timer } from "lucide-react";
import { DemoStartButton } from "@/components/marketing/demo-button";
import { MockDashboard } from "@/components/marketing/mocks";
import { Reveal } from "@/components/marketing/reveal";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "デモを試す",
  description: `${APP_NAME}のデモ。登録不要・1分でサンプルデータ入りの管理画面を体験できます。案件別の利益管理・AIレシート読み取り・見積請求PDFをそのまま操作可能。`,
  alternates: { canonical: "/demo" },
};

const POINTS = [
  {
    icon: Timer,
    title: "登録不要・1分で体験",
    body: "メールアドレスの入力も不要。ボタンひとつでサンプルデータ入りの管理画面が開きます。",
  },
  {
    icon: MousePointerClick,
    title: "全機能をそのまま操作",
    body: "案件の作成、レシート登録、見積書PDFの発行まで、製品版と同じ機能を制限なく試せます。",
  },
  {
    icon: ShieldCheck,
    title: "データはブラウザ内のみ",
    body: "デモのデータはお使いのブラウザにのみ保存されます。サーバーには送信されません。",
  },
];

const TRY_LIST = [
  "ダッシュボードで赤字案件・未入金を確認する",
  "「写真から登録」でレシートのAI読み取りを試す",
  "案件ボードでステータスをドラッグ&ドロップ",
  "見積書・請求書を作成してPDFを発行する",
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
              サンプルの工事案件・レシート・請求書が入ったデモ環境をご用意しました。
              まずは触って、現場の収支が「見える」感覚を確かめてください。
            </p>
            <div className="mt-8">
              <DemoStartButton className="shadow-lg shadow-brand-600/25" />
            </div>
            <p className="mt-3 text-[11px] text-neutral-400">
              クレジットカード不要・メールアドレス不要
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <MockDashboard />
            </Reveal>
            <div className="space-y-6">
              {POINTS.map((p, i) => (
                <Reveal key={p.title} delay={i * 0.08}>
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
      </section>

      <section className="border-t border-neutral-100 bg-surface py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center text-xl font-bold text-neutral-900 sm:text-2xl">
              デモで試してほしいこと
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-8 space-y-2.5">
              {TRY_LIST.map((t, i) => (
                <div
                  key={t}
                  className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white tnum">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-neutral-800">{t}</p>
                  <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-neutral-200" />
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.15} className="mt-10 text-center">
            <DemoStartButton />
          </Reveal>
        </div>
      </section>
    </>
  );
}
