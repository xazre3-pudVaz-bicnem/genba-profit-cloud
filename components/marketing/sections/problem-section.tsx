import { AlertTriangle, Calculator, Car, FileClock, Package, Table2 } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

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
    title: "Excel管理が属人化している",
    body: "社長しか触れない集計表。担当者が変わると誰も分からなくなる。",
  },
  {
    icon: AlertTriangle,
    title: "赤字に気づくのが遅い",
    body: "決算のときに初めて「あの現場、赤字だったのか」と判明する。",
  },
];

/** 課題提起（ダークセクション） */
export function ProblemSection() {
  return (
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
  );
}
