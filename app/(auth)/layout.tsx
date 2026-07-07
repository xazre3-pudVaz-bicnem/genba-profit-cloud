import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "ログイン・新規登録",
  robots: { index: false, follow: false },
};

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
