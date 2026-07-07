import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Supabase接続
// 環境変数が未設定の場合はnullを返し、アプリはデモモード
// （ローカル保存）で動作する。設定済みの場合は認証・ストレージが
// 有効になる。DBのCRUD差し替えポイントは lib/store.ts を参照。
// ============================================================

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** ブラウザ用Supabaseクライアント（未設定ならnull） */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: true, autoRefreshToken: true } }
    );
  }
  return client;
}

// 書類ファイルのアップロード・署名URLは lib/app/supabase-store.ts が担当する
// （会社IDのパス規約とRLSポリシーに従うため）
