import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { APP_NAME } from "@/lib/shared/config";
import { marketingUrl } from "@/lib/urls";

/**
 * 認証専用レイアウト（LPともアプリとも独立）。
 * 左: サービス説明パネル / 右: フォーム
 * 将来的に app.genba-profit-cloud.jp 側へそのまま移動できる
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* 左: ブランドパネル */}
      <div className="relative hidden overflow-hidden bg-neutral-950 lg:block">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href={marketingUrl("/")}>
            <span className="flex items-center gap-2">
              <Logo className="[&_span:last-child]:text-white" />
            </span>
          </Link>
          <div>
            <p className="text-3xl font-bold leading-snug text-white">
              建設現場の利益管理を、
              <br />
              もっと簡単に。
            </p>
            <p className="mt-4 max-w-md text-sm leading-7 text-neutral-400">
              案件ごとの売上・材料費・外注費・経費を一元管理。
              レシートや請求書を写真でアップロードするだけで、利益と利益率を自動計算します。
            </p>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              {[
                { value: "3タップ", label: "レシート登録" },
                { value: "リアルタイム", label: "利益率の把握" },
                { value: "自動警告", label: "赤字・未請求" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-bold text-white">{s.value}</p>
                  <p className="mt-0.5 text-[10px] text-neutral-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} {APP_NAME}
          </p>
        </div>
      </div>

      {/* 右: フォーム */}
      <div className="flex flex-col bg-surface">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <Link href={marketingUrl("/")} className="lg:hidden">
            <Logo size="sm" />
          </Link>
          <Link
            href={marketingUrl("/")}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
          >
            サービス紹介へ戻る
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center p-5 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
