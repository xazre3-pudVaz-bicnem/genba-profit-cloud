import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { APP_NAME } from "@/lib/shared/config";

// アプリ側のmetadata（SEO対象外・noindex）
export const metadata: Metadata = {
  title: {
    absolute: `管理画面｜${APP_NAME}`,
  },
  description: `案件別の売上、原価、利益率、書類を管理する${APP_NAME}の管理画面です。`,
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
