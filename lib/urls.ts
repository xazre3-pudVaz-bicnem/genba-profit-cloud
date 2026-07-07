// ============================================================
// URL生成ヘルパーの公開エントリポイント
//
// LPとアプリを将来別ドメインで運用するため、CTA・ヘッダー・
// フッター・法務ページ・OGP・sitemapのURLはすべてここを経由する。
// URLのベタ書きは禁止。
//
// 切り替えは環境変数のみ:
//   現在:  NEXT_PUBLIC_MARKETING_URL=https://genba-profit-cloud.vercel.app
//          NEXT_PUBLIC_APP_URL=https://genba-profit-cloud.vercel.app/app
//   将来:  NEXT_PUBLIC_MARKETING_URL=https://genba-profit-cloud.jp
//          NEXT_PUBLIC_APP_URL=https://app.genba-profit-cloud.jp
//
// 実装は lib/shared/urls.ts（LP/アプリ双方から安全にimport可能）
// ============================================================

export {
  // ベース
  marketingUrl,
  appUrl,
  // 用途別
  loginUrl,
  signupUrl,
  demoUrl,
  appDashboardUrl,
  pricingUrl,
  termsUrl,
  privacyUrl,
  commercialLawUrl,
  // 後方互換（既存コードで使用。新規コードは上のnamedヘルパーを使う）
  appAuthUrl,
  appDemoUrl,
} from "./shared/urls";

import { CONTACT_EMAIL } from "./shared/config";

/** 問い合わせ先メールアドレス（NEXT_PUBLIC_CONTACT_EMAIL で変更可） */
export function contactEmail(): string {
  return CONTACT_EMAIL;
}
