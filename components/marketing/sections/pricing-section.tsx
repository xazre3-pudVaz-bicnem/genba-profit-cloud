import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { Button } from "@/components/shared/button";
import { PLANS } from "@/lib/marketing/content";
import { appAuthUrl } from "@/lib/shared/urls";
import { cn } from "@/lib/shared/utils";

/** 料金プラン（LP用） */
export function PricingSection() {
  return (
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
                <Link href={appAuthUrl("/signup")} className="mt-6">
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
  );
}
