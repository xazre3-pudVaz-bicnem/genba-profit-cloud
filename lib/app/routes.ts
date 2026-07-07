// ============================================================
// アプリ内ルーティング
//
// 現在は /app プレフィックス配下で動作。将来 app.genba-profit-cloud.jp
// へ分離してプレフィックスを外す場合は、APP_BASE_PATH を "" に変更するか、
// アプリ側プロジェクトの next.config で
//   rewrites: [{ source: "/:path((?!app|api|_next).*)", destination: "/app/:path" }]
// を設定する（README「将来のドメイン分離」参照）。
// ============================================================

export const APP_BASE_PATH = "/app";

/** アプリ内パスを生成する（例: appPath("/projects/new")） */
export function appPath(path = ""): string {
  const p = `${APP_BASE_PATH}${path}`;
  return p === "" ? "/" : p;
}
