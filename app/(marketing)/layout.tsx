import type { Metadata } from "next";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { APP_NAME, SITE_URL } from "@/lib/shared/config";

// LP側のmetadata（SEO対象。アプリ側とは分離）
export const metadata: Metadata = {
  title: {
    absolute: `建設業向け案件別収支管理システム｜${APP_NAME}`,
  },
  description: `${APP_NAME}は、建設・内装・設備・リフォーム会社向けの案件別収支管理システムです。売上、材料費、発注費、経費、レシート、請求書を案件ごとに管理し、利益と利益率を自動計算します。`,
  robots: { index: true, follow: true },
  openGraph: {
    title: `建設業向け案件別収支管理システム｜${APP_NAME}`,
    description: `${APP_NAME}は、建設・内装・設備・リフォーム会社向けの案件別収支管理システムです。売上、材料費、発注費、経費、レシート、請求書を案件ごとに管理し、利益と利益率を自動計算します。`,
    url: SITE_URL,
    locale: "ja_JP",
    type: "website",
    siteName: APP_NAME,
    images: [{ url: "/ogp.png", width: 1200, height: 630, alt: APP_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `建設業向け案件別収支管理システム｜${APP_NAME}`,
    images: ["/ogp.png"],
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
