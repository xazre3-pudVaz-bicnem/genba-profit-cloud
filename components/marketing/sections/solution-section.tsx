import { ArrowRight, Calculator, Camera, FolderPlus, Sparkles, TrendingUp } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

const STEPS = [
  { icon: FolderPlus, title: "案件を作る", body: "案件名と顧客名を入れるだけ。30秒で完了" },
  { icon: Camera, title: "レシートを撮る", body: "レシート・請求書をスマホで撮影" },
  { icon: Sparkles, title: "AIが金額を読み取る", body: "金額・日付・取引先を自動抽出" },
  { icon: Calculator, title: "案件ごとに自動集計", body: "材料費・外注費・経費を自動振り分け" },
  { icon: TrendingUp, title: "利益と利益率が見える", body: "粗利と利益率をリアルタイム表示" },
];

/** 解決策（5ステップ） */
export function SolutionSection() {
  return (
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
  );
}
