// ============================================================
// LP・アプリ共通のサービス設定
// サービス名はここ（またはenv）で一元管理する
// ============================================================

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "現場収支クラウド";
export const APP_TAGLINE = "案件別収支管理クラウド";
export const APP_DESCRIPTION =
  "建設・内装・設備・リフォームなど現場系事業者のための案件別収支管理SaaS。レシートや請求書を写真でアップロードするだけで、案件ごとの売上・材料費・外注費・利益率を自動集計します。";

/** LP側の公開URL（SEO・OGP・sitemap用） */
export const SITE_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";
