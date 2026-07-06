import type { Metadata } from "next";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Calculator,
  Camera,
  Car,
  CheckCircle2,
  FileClock,
  FileText,
  FolderKanban,
  FolderPlus,
  Handshake,
  JapaneseYen,
  Package,
  Receipt,
  ScanLine,
  Sparkles,
  Table2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { DemoStartButton } from "@/components/marketing/demo-button";
import { FaqList } from "@/components/marketing/faq";
import { FloatingCards, MockDashboard, ScreensTabs } from "@/components/marketing/mocks";
import { Reveal } from "@/components/marketing/reveal";
import { Button } from "@/components/ui/button";
import {
  APP_DESCRIPTION,
  APP_NAME,
  FAQ_ITEMS,
  INDUSTRIES,
  PLANS,
  SITE_URL,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `建設業向け 案件別収支管理システム｜${APP_NAME}`,
  description:
    "建設・内装・設備・リフォーム業向けの案件収支管理SaaS。レシート・請求書を写真で撮るだけでAIが読み取り、案件ごとの売上・材料費・外注費・利益率を自動集計。赤字案件・請求漏れを自動で警告します。",
  keywords: [
    "建設業 収支管理",
    "工事 原価管理 アプリ",
    "案件 利益管理",
    "現場 レシート管理",
    "一人親方 経費管理",
    "工務店 粗利管理",
  ],
  openGraph: {
    title: `建設現場の利益管理を、もっと簡単に。｜${APP_NAME}`,
    description: APP_DESCRIPTION,
    locale: "ja_JP",
    type: "website",
  },
  alternates: { canonical: "/" },
};

const PAINS = [
  {
    icon: Calculator,
    title: "案件ごとの利益が分からない",
    body: "工事が終わっても、結局いくら儲かったのか正確に分からないまま次の現場へ。",
  },
  {
    icon: Package,
    title: "材料費があとから膨らむ",
    body: "見積時の想定と実際の仕入れがズレても、気づくのは月末の集計後。",
  },
  {
    icon: Car,
    title: "領収書が車や現場に散らばる",
    body: "ダッシュボードの上、作業着のポケット。月末にまとめて処理する地獄。",
  },
  {
    icon: FileClock,
    title: "請求漏れが起きる",
    body: "追加工事分の請求を忘れて、そのまま利益が消えていく。",
  },
  {
    icon: Table2,
    title: "Excelが属人化している",
    body: "社長しか触れない集計表。担当者が変わると誰も分からなくなる。",
  },
  {
    icon: AlertTriangle,
    title: "赤字に気づくのが遅い",
    body: "決算のときに初めて「あの現場、赤字だったのか」と判明する。",
  },
];

const STEPS = [
  { icon: FolderPlus, title: "案件を作る", body: "案件名と顧客名を入れるだけ。30秒で完了" },
  { icon: Camera, title: "書類を写真で撮る", body: "レシート・請求書をスマホで撮影" },
  { icon: Sparkles, title: "AIが読み取る", body: "金額・日付・取引先を自動抽出" },
  { icon: Calculator, title: "案件ごとに自動集計", body: "材料費・外注費・経費を自動振り分け" },
  { icon: TrendingUp, title: "利益が見える", body: "粗利と利益率をリアルタイム表示" },
];

const FEATURES = [
  { icon: FolderKanban, title: "案件管理", body: "複数現場をリスト・ボード・カレンダーで一元管理。ステータスや担当者で瞬時に絞り込み。" },
  { icon: JapaneseYen, title: "売上管理", body: "着手金・完工金を案件ごとに登録。未請求・未入金を自動で追跡します。" },
  { icon: Handshake, title: "発注費管理", body: "協力会社・外注先への発注と支払予定を管理。払い漏れを防ぎます。" },
  { icon: Package, title: "材料費管理", body: "ホームセンターのレシートも写真1枚で登録。案件別の材料費が積み上がります。" },
  { icon: Receipt, title: "経費管理", body: "駐車場代・ガソリン代・処分費まで。現場のこまかい経費も漏らさず記録。" },
  { icon: ScanLine, title: "AIレシート読み取り", body: "金額・日付・取引先・品目をAIが自動抽出。確認して保存するだけ。" },
  { icon: FileText, title: "見積・請求管理", body: "明細を入れるだけでA4のきれいな見積書・請求書PDFを発行できます。" },
  { icon: Calculator, title: "利益の自動計算", body: "売上−原価を常時計算。利益率20%未満は警告、赤字は赤色で即表示。" },
  { icon: Archive, title: "書類の保管", body: "レシート・請求書・見積書を案件に紐づけてクラウド保管。あとから探せる。" },
];

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: APP_NAME,
        url: SITE_URL,
        description: APP_DESCRIPTION,
      },
      {
        "@type": "SoftwareApplication",
        name: APP_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        description: APP_DESCRIPTION,
        offers: PLANS.map((p) => ({
          "@type": "Offer",
          name: `${p.name}プラン`,
          price: p.price,
          priceCurrency: "JPY",
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_ITEMS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />

      {/* ============ ヒーロー ============ */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_10%,rgba(249,115,22,0.08),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,white)] [background-size:100%_100%]" />
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
                <Link href="/signup">
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
                  href="/demo"
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

      {/* ============ 課題提起 ============ */}
      <section className="bg-neutral-950 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-widest text-brand-500">PROBLEM</p>
            <h2 className="mt-3 text-center text-2xl font-bold leading-snug text-white sm:text-3xl">
              案件ごとの利益、
              <br className="sm:hidden" />
              ちゃんと見えていますか？
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-7 text-neutral-400">
              現場系の仕事では、売上・発注費・材料費・レシートがバラバラに管理されがち。
              こんな悩みに心当たりはありませんか。
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PAINS.map((pain, i) => (
              <Reveal key={pain.title} delay={i * 0.05}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/[0.08]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15">
                    <pain.icon className="h-5 w-5 text-brand-400" />
                  </span>
                  <p className="mt-4 text-sm font-bold text-white">{pain.title}</p>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">{pain.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 解決策（5ステップ） ============ */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-widest text-brand-600">SOLUTION</p>
            <h2 className="mt-3 text-center text-2xl font-bold leading-snug text-neutral-900 sm:text-3xl">
              「撮るだけ」で、利益が見える仕組み
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-7 text-neutral-500">
              会計ソフトのような難しさはありません。現場の人がそのまま使える、たった5ステップです。
            </p>
          </Reveal>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.07}>
                <div className="relative h-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
                  <span className="absolute right-4 top-4 text-2xl font-bold text-neutral-100">
                    {i + 1}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <step.icon className="h-5 w-5 text-brand-600" />
                  </span>
                  <p className="mt-4 text-sm font-bold text-neutral-900">{step.title}</p>
                  <p className="mt-1.5 text-xs leading-5 text-neutral-500">{step.body}</p>
                  {i < STEPS.length - 1 ? (
                    <ArrowRight className="absolute -right-2.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-neutral-300 lg:block" />
                  ) : null}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 画面イメージ ============ */}
      <section className="border-y border-neutral-100 bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-widest text-brand-600">SCREENS</p>
            <h2 className="mt-3 text-center text-2xl font-bold leading-snug text-neutral-900 sm:text-3xl">
              どの現場が儲かっているか、一目で分かる
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <ScreensTabs />
          </Reveal>
        </div>
      </section>

      {/* ============ 主な機能 ============ */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-widest text-brand-600">FEATURES</p>
            <h2 className="mt-3 text-center text-2xl font-bold leading-snug text-neutral-900 sm:text-3xl">
              現場の収支管理に必要な機能を、全部入りで
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.06}>
                <div className="group h-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 transition-colors group-hover:bg-brand-50">
                    <f.icon className="h-5 w-5 text-neutral-500 transition-colors group-hover:text-brand-600" />
                  </span>
                  <p className="mt-4 text-sm font-bold text-neutral-900">{f.title}</p>
                  <p className="mt-2 text-xs leading-6 text-neutral-500">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 text-center">
            <Link href="/features" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              すべての機能を見る
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============ 業種別活用例 ============ */}
      <section className="border-y border-neutral-100 bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-widest text-brand-600">INDUSTRIES</p>
            <h2 className="mt-3 text-center text-2xl font-bold leading-snug text-neutral-900 sm:text-3xl">
              8つの業種で、現場の数字を変える
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-7 text-neutral-500">
              一人親方から小規模工務店まで。下請け・元請けを問わずお使いいただけます。
            </p>
          </Reveal>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {INDUSTRIES.map((ind, i) => (
              <Reveal key={ind.name} delay={(i % 4) * 0.05}>
                <div className="h-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
                  <p className="text-sm font-bold text-neutral-900">{ind.name}</p>
                  <p className="mt-2 text-xs leading-6 text-neutral-500">{ind.example}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 料金 ============ */}
      <section className="py-20 sm:py-24" id="pricing">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-widest text-brand-600">PRICING</p>
            <h2 className="mt-3 text-center text-2xl font-bold leading-snug text-neutral-900 sm:text-3xl">
              シンプルな料金プラン
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-7 text-neutral-500">
              すべてのプランで14日間の無料トライアル。クレジットカード不要で始められます。
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 0.08}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-card",
                    plan.highlighted
                      ? "border-brand-500 shadow-pop ring-2 ring-brand-500/20"
                      : "border-neutral-200"
                  )}
                >
                  {plan.highlighted ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-[10px] font-bold text-white shadow-sm">
                      人気No.1
                    </span>
                  ) : null}
                  <p className="text-sm font-bold text-neutral-900">{plan.name}</p>
                  <p className="mt-1 text-xs text-neutral-400">{plan.description}</p>
                  <p className="mt-4">
                    <span className="tnum text-3xl font-bold tracking-tight text-neutral-900">
                      ¥{plan.price.toLocaleString("ja-JP")}
                    </span>
                    <span className="ml-1 text-xs text-neutral-400">/ {plan.unit}</span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-neutral-600">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="mt-6">
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? "primary" : "secondary"}
                    >
                      無料で試す
                    </Button>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="border-t border-neutral-100 bg-surface py-20 sm:py-24" id="faq">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-widest text-brand-600">FAQ</p>
            <h2 className="mt-3 text-center text-2xl font-bold leading-snug text-neutral-900 sm:text-3xl">
              よくある質問
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <FaqList />
          </Reveal>
        </div>
      </section>

      {/* ============ 最終CTA ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-700 py-20">
        <div className="pointer-events-none absolute -left-20 -top-32 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <h2 className="text-2xl font-bold leading-snug text-white sm:text-3xl">
              Excel管理・紙の領収書・LINE写真管理から、
              <br className="hidden sm:block" />
              今日卒業しませんか。
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-brand-100">
              まずはデモで操作感を確認してください。登録不要・1分で全機能を体験できます。
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <DemoStartButton variant="dark" label="まずはデモで操作感を確認" className="bg-neutral-950 hover:bg-neutral-900" />
              <Link href="/signup">
                <Button size="lg" variant="secondary">
                  無料で試す
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
