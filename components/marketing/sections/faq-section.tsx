import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { FAQ_ITEMS } from "@/lib/marketing/content";

/** FAQアコーディオン（native details/summary） */
export function FaqList({ items = FAQ_ITEMS }: { items?: { q: string; a: string }[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <details
          key={item.q}
          className="group rounded-2xl border border-neutral-200 bg-white transition-shadow open:shadow-card"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-semibold text-neutral-900">{item.q}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
          </summary>
          <p className="px-5 pb-5 text-sm leading-7 text-neutral-600">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

/** FAQセクション（LP用） */
export function FaqSection() {
  return (
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
  );
}
