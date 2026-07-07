import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { PageSkeleton } from "@/components/shared/skeleton";

export const metadata: Metadata = {
  title: "新規登録",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SignupForm />
    </Suspense>
  );
}
