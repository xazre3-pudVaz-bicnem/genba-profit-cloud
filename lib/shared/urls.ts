// ============================================================
// LP ⇄ アプリ間のURLヘルパー
//
// 将来的にLP（genba-profit-cloud.jp）とアプリ
// （app.genba-profit-cloud.jp）を別プロジェクトへ分離する前提で、
// CTAリンクはすべてこのヘルパーを経由する（ハードコード禁止）。
//
// 【単一プロジェクト運用（現在）】環境変数なしでそのまま動く
//   appUrl()            → /app
//   appUrl("/projects") → /app/projects
//   appAuthUrl("/login") → /login
//
// 【分離後】.env に以下を設定するだけで全CTAが切り替わる
//   NEXT_PUBLIC_MARKETING_URL=https://genba-profit-cloud.jp
//   NEXT_PUBLIC_APP_URL=https://app.genba-profit-cloud.jp
//   appUrl()             → https://app.genba-profit-cloud.jp
//   appAuthUrl("/login") → https://app.genba-profit-cloud.jp/login
//
// 開発中に NEXT_PUBLIC_APP_URL=http://localhost:3000/app の形式で
// 指定した場合も正しく解決される（認証はホスト直下の /login）。
// ============================================================

interface AppBase {
  /** アプリのオリジン（未分離時は空文字 = 同一ホスト） */
  origin: string;
  /** アプリ画面のパスプレフィックス（分離後は "" になる） */
  prefix: string;
}

function appBase(): AppBase {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!raw) return { origin: "", prefix: "/app" };
  // 例: http://localhost:3000/app → origin=http://localhost:3000, prefix=/app
  if (raw.endsWith("/app")) return { origin: raw.slice(0, -4), prefix: "/app" };
  // 例: https://app.genba-profit-cloud.jp → アプリはルート直下
  return { origin: raw.replace(/\/$/, ""), prefix: "" };
}

/** アプリ画面へのURL（例: appUrl("/projects")） */
export function appUrl(path = ""): string {
  const { origin, prefix } = appBase();
  return `${origin}${prefix}${path}` || "/";
}

/** ログイン・新規登録へのURL（認証はアプリ側ドメインに属する） */
export function appAuthUrl(
  path: "/login" | "/signup" | `/signup?${string}` | `/login?${string}`
): string {
  const { origin } = appBase();
  return `${origin}${path}`;
}

/** デモモードでアプリを開くURL */
export function appDemoUrl(): string {
  return `${appUrl()}?demo=true`;
}

/** LP側へのURL（アプリからのログアウト遷移などに使用） */
export function marketingUrl(path = "/"): string {
  const base = process.env.NEXT_PUBLIC_MARKETING_URL ?? "";
  return `${base.replace(/\/$/, "")}${path}` || "/";
}

// ------------------------------------------------------------
// 用途別の named ヘルパー（CTA・フッター・法務ページはこちらを使う）
// エントリポイントは lib/urls.ts
// ------------------------------------------------------------

/** ログイン画面 */
export function loginUrl(): string {
  return appAuthUrl("/login");
}

/** 新規登録（planを渡すと /signup?plan=xxx で引き継ぐ） */
export function signupUrl(plan?: string): string {
  return appAuthUrl(plan ? `/signup?plan=${plan}` : "/signup");
}

/** デモ管理画面（ログイン不要） */
export function demoUrl(): string {
  return appDemoUrl();
}

/** ログイン後の管理画面（ダッシュボード） */
export function appDashboardUrl(): string {
  return appUrl();
}

/** LP: 料金ページ */
export function pricingUrl(): string {
  return marketingUrl("/pricing");
}

/** LP: 利用規約 */
export function termsUrl(): string {
  return marketingUrl("/terms");
}

/** LP: プライバシーポリシー */
export function privacyUrl(): string {
  return marketingUrl("/privacy");
}

/** LP: 特定商取引法に基づく表記 */
export function commercialLawUrl(): string {
  return marketingUrl("/commercial-law");
}
