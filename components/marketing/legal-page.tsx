import type { ReactNode } from "react";

// ============================================================
// 法務ページ共通レイアウト（利用規約・プライバシー・特商法）
// ============================================================

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-neutral-100 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{title}</h1>
        <p className="mt-2 text-xs text-neutral-400">最終更新日: {updatedAt}</p>
        <div className="mt-8 space-y-8 text-[13px] leading-7 text-neutral-600">{children}</div>
      </div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 border-l-4 border-brand-500 pl-3 text-sm font-bold text-neutral-900">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
