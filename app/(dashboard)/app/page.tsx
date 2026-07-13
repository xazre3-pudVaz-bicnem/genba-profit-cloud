import { redirect } from "next/navigation";

// ============================================================
// アプリの入口は「写真登録」（現場ユーザーが迷わない最短導線）
// 経営向けのダッシュボードは /app/dashboard に残してあり、
// 設定画面からアクセスできる。
// ============================================================

export default async function AppIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // ?demo=true はデモセッション開始のトリガーなので必ず引き継ぐ
  redirect(
    params.demo === "true" ? "/app/documents/upload?demo=true" : "/app/documents/upload"
  );
}
