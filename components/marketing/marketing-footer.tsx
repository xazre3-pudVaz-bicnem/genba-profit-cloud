import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { APP_NAME, APP_TAGLINE } from "@/lib/shared/config";
import { loginUrl, signupUrl } from "@/lib/urls";

/** LP専用フッター（アプリ側では使用しない） */
export function MarketingFooter() {
  const groups = [
    {
      title: "プロダクト",
      items: [
        { label: "機能", href: "/features" },
        { label: "料金プラン", href: "/pricing" },
        { label: "デモを見る", href: "/demo" },
      ],
    },
    {
      title: "はじめる",
      items: [
        { label: "無料で試す", href: signupUrl() },
        { label: "ログイン", href: loginUrl() },
      ],
    },
    {
      title: "規約・法務",
      items: [
        { label: "利用規約", href: "/terms" },
        { label: "プライバシーポリシー", href: "/privacy" },
        { label: "特定商取引法に基づく表記", href: "/commercial-law" },
      ],
    },
  ];

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-xs leading-6 text-neutral-500">
              {APP_TAGLINE}。建設・内装・設備・リフォームなど、
              現場仕事の「案件ごとの利益」を見える化するクラウドサービスです。
            </p>
          </div>
          <div className="flex flex-wrap gap-x-16 gap-y-8">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="text-xs font-bold text-neutral-900">{group.title}</p>
                <ul className="mt-3 space-y-2.5">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-xs text-neutral-500 transition-colors hover:text-brand-600"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 border-t border-neutral-100 pt-6">
          <p className="text-[11px] text-neutral-400">
            © {new Date().getFullYear()} {APP_NAME} All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
