import { Reveal } from "@/components/marketing/reveal";
import { INDUSTRIES } from "@/lib/marketing/content";

/** 業種別活用例 */
export function IndustrySection() {
  return (
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
  );
}
