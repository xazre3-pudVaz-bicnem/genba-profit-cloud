"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { startDemoSession } from "@/lib/store";
import { cn } from "@/lib/utils";

/** デモセッションを開始して管理画面へ遷移するボタン */
export function DemoStartButton({
  className,
  size = "lg",
  variant = "primary",
  label = "デモデータで今すぐ試す",
}: {
  className?: string;
  size?: "md" | "lg";
  variant?: "primary" | "secondary" | "dark";
  label?: string;
}) {
  const router = useRouter();

  return (
    <Button
      size={size}
      variant={variant}
      className={cn(className)}
      onClick={() => {
        startDemoSession();
        toast({ title: "デモモードで開始しました", description: "サンプルデータで全機能を試せます" });
        router.push("/app");
      }}
    >
      <Sparkles className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
      {label}
    </Button>
  );
}
