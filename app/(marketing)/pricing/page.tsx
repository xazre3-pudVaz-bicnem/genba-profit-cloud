import type { Metadata } from "next";
import { CheckCircle2, Minus } from "lucide-react";
import Link from "next/link";
import { FaqList } from "@/components/marketing/sections/faq-section";
import { Reveal } from "@/components/marketing/reveal";
import { Button } from "@/components/shared/button";
import { FAQ_ITEMS, PLANS } from "@/lib/marketing/content";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/shared/config";
import { appAuthUrl } from "@/lib/shared/urls";
import { cn } from "@/lib/shared/utils";

export const metadata: Metadata = {
  title: "料金プラン",
  description: `${APP_NAME}の料金プラン。ライト月額9,800円から。すべてのプランで14日間無料トライアル。一人親方から工務店まで、規模に合わせて選べます。`,
  alternates: { canonical: "/pricing" },
};

const COMPARISON: { label: string; values: (string | boolean)[] }[] = [
  { label: "メンバー数", values: ["1名", "3名まで", "10名まで"] },
  { label: "書類アップロード", values: ["月50枚", "月300枚", "月1,000枚"] },
  { label: "案件管理・収支・利益率", values: [true, true, true] },
  { label: "売上・原価管理", values: [true, true, true] },
  { label: "案件ボード・カレンダー", values: [true, true, true] },
  { label: "AI OCR読み取り", values: [false, true, true] },
  { label: "見積書・請求書PDF", values: [false, true, true] },
  { label: "未請求・未入金アラート", values: [true, true, true] },
  { label: "サポート", values: ["メール", "メール", "優先対応"] },
];

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-neutral-100 bg-surface py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-widest text-brand-600">PRICING</p>
            <h1 className="mt-3 text-center text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              シンプルで分かりやすい料金
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-7 text-neutral-500">
              すべてのプランで14日間の無料トライアル。クレジットカード登録は不要です。
              期間中はいつでもキャンセルできます。
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
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-[10px] font-bold text-white">
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
                  <Link href={appAuthUrl(`/signup?plan=${plan.id}`)} className="mt-6">
                    <Button className="w-full" variant={plan.highlighted ? "primary" : "secondary"}>
                      無料で試す
                    </Button>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 比較表 */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center text-xl font-bold text-neutral-900 sm:text-2xl">プラン比較</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-card">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">機能</th>
                    {PLANS.map((p) => (
                      <th
                        key={p.id}
                        className={cn(
                          "px-4 py-3 text-center text-xs font-bold",
                          p.highlighted ? "text-brand-700" : "text-neutral-700"
                        )}
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {COMPARISON.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-3 text-xs font-medium text-neutral-700">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="px-4 py-3 text-center">
                          {v === true ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                          ) : v === false ? (
                            <Minus className="mx-auto h-4 w-4 text-neutral-200" />
                          ) : (
                            <span className="text-xs font-semibold text-neutral-700">{v}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-neutral-100 bg-surface py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center text-xl font-bold text-neutral-900 sm:text-2xl">
              料金についてよくある質問
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-8">
            <FaqList items={FAQ_ITEMS.slice(0, 4)} />
          </Reveal>
          <Reveal delay={0.15} className="mt-10">
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={appAuthUrl("/signup")}>
                <Button size="lg">無料で試す</Button>
              </Link>
              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} 導入相談`)}`}>
                <Button size="lg" variant="secondary">
                  相談する
                </Button>
              </a>
              <Link href="/demo">
                <Button size="lg" variant="ghost">
                  デモを見る
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
