import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { Button } from "@/components/shared/button";
import { demoUrl, signupUrl } from "@/lib/urls";

/** 最終CTA */
export function FinalCtaSection() {
  return (
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
            <Link href={demoUrl()}>
              <Button size="lg" variant="dark" className="bg-neutral-950 hover:bg-neutral-900">
                まずはデモで操作感を確認
              </Button>
            </Link>
            <Link href={signupUrl()}>
              <Button size="lg" variant="secondary">
                無料で試す
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
