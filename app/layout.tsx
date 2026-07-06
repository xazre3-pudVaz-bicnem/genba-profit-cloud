import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, SITE_URL } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${APP_NAME}｜建設・現場仕事の案件別収支管理SaaS`,
    template: `%s｜${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: ["建設業 収支管理", "工事 原価管理", "案件 利益管理", "現場 経費精算", APP_TAGLINE],
  openGraph: {
    title: `${APP_NAME}｜建設現場の利益管理を、もっと簡単に。`,
    description: APP_DESCRIPTION,
    locale: "ja_JP",
    type: "website",
    siteName: APP_NAME,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable}`}>
      <body className="font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
