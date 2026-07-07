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

/**
 * 書類画像をSupabase Storageへアップロードする。
 * 未設定・失敗時はnullを返す（デモモードではローカルサムネイルのみ保持）。
 */
export async function uploadDocumentImage(
  dataUrl: string,
  fileName: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("documents").upload(path, blob, {
      contentType: blob.type,
      upsert: false,
    });
    if (error) return null;
    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    return data.publicUrl ?? null;
  } catch {
    return null;
  }
}
