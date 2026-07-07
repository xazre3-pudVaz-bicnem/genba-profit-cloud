import { ScreensTabs } from "@/components/marketing/mocks";
import { Reveal } from "@/components/marketing/reveal";

/**
 * 画面イメージ（スクリーンショット風の販売用モック）。
 * 実際の管理画面の操作はここでは行わない
 */
export function ScreenMockSection() {
  return (
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
  );
}
