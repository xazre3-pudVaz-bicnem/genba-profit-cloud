import { NextResponse, type NextRequest } from "next/server";

// ============================================================
// ドメイン分離用プロキシ（Next.js 16のproxy規約）
//
// LP（NEXT_PUBLIC_MARKETING_URL）とアプリ（NEXT_PUBLIC_APP_URL）を
// 別ドメインで運用するときだけ動作する。
//
//   LPドメイン    genba-profit-cloud.jp      → LPページのみ。/app・認証はアプリ側へ308
//   アプリドメイン app.genba-profit-cloud.jp → 管理画面のみ。LPページはLP側へ308、/ は /app へ
//
// 【安全設計】
//   - 両URLのホストが同じ（現在のVercel単一運用）→ 何もしない
//   - 環境変数が未設定・不正 → 何もしない（開発・プレビューを邪魔しない）
//   - リダイレクトは「自分と異なるホストへ」のみ発行するためループしない
// ============================================================

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/** LPドメインが受け持つページ（sitemap掲載対象と一致させる） */
const MARKETING_PATHS = new Set([
  "/features",
  "/pricing",
  "/demo",
  "/terms",
  "/privacy",
  "/commercial-law",
]);

export function proxy(req: NextRequest) {
  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const marketingHost = hostOf(marketingUrl);
  const appHost = hostOf(appUrl);

  // 単一ドメイン運用・未設定・localhost開発では何もしない
  if (!marketingHost || !appHost || marketingHost === appHost) {
    return NextResponse.next();
  }

  const host = req.headers.get("host");
  const { pathname, search } = req.nextUrl;

  // ---- LPドメイン: アプリ・認証ページはアプリドメインへ ----
  if (host === marketingHost) {
    if (
      pathname === "/app" ||
      pathname.startsWith("/app/") ||
      pathname === "/login" ||
      pathname === "/signup"
    ) {
      const dest = new URL(appUrl as string);
      dest.pathname = pathname; // アプリ側も当面 /app ルートを維持するためパスはそのまま
      dest.search = search;
      return NextResponse.redirect(dest, 308);
    }
    return NextResponse.next();
  }

  // ---- アプリドメイン: LPページはLPドメインへ・ルートは管理画面へ ----
  if (host === appHost) {
    if (MARKETING_PATHS.has(pathname)) {
      const dest = new URL(marketingUrl as string);
      dest.pathname = pathname;
      dest.search = search;
      return NextResponse.redirect(dest, 308);
    }
    if (pathname === "/") {
      // アプリドメインのトップは管理画面（未ログインならAppShellが/loginへ）
      const url = req.nextUrl.clone();
      url.pathname = "/app";
      return NextResponse.redirect(url, 307);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // 静的ファイル・API・Next内部は対象外（リダイレクト暴走防止）
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
