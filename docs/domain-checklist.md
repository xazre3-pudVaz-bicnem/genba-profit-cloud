# 本番ドメイン設定チェックリスト

LP `https://genba-profit-cloud.jp` とアプリ `https://app.genba-profit-cloud.jp` へ
分離するときの作業手順。**Stripe課金を有効化する前に完了させること**
（Checkout / Webhook のcallback URLがドメインに依存するため、後から変えると再設定が必要になる）。

## 手順

### 1. LP用ドメインをVercelに追加
- Vercel → Project → Settings → Domains → `genba-profit-cloud.jp` を追加
- `www.genba-profit-cloud.jp` を追加する場合はapexへのリダイレクトを設定

### 2. app用サブドメインをVercelに追加
- 同じプロジェクトに `app.genba-profit-cloud.jp` を追加
  （middlewareがホスト名でLP/アプリを振り分けるため、当面は単一プロジェクトでよい）

### 3. DNS設定
- apex（genba-profit-cloud.jp）: `A 76.76.21.21`（Vercel指定の値に従う）
- `app` サブドメイン: `CNAME cname.vercel-dns.com`
- 反映後、Vercelのドメイン欄が「Valid Configuration」になることを確認

### 4. Vercel環境変数を変更（Production）
```bash
NEXT_PUBLIC_MARKETING_URL=https://genba-profit-cloud.jp
NEXT_PUBLIC_APP_URL=https://app.genba-profit-cloud.jp
```
他（Supabase・ANTHROPIC_API_KEY等）は変更不要。

### 5. 再デプロイ
- 環境変数は再デプロイで反映される（Deployments → Redeploy）

### 6. LP表示確認
- `https://genba-profit-cloud.jp/` `/features` `/pricing` `/demo` `/terms` `/privacy` `/commercial-law`
- LPドメインで `/app` を開く → `https://app.genba-profit-cloud.jp/app` へ308リダイレクトされる
- アプリドメインで `/pricing` を開く → LPドメインへ308リダイレクトされる

### 7. アプリログイン確認
- `https://app.genba-profit-cloud.jp/login` でログイン → `/app` に入れる
- LPの「無料で試す」「ログイン」CTAがappドメインへ遷移する
- `https://app.genba-profit-cloud.jp/app?demo=true` がログイン不要で動く
- **Supabase側**: Authentication → URL Configuration の Site URL / Redirect URLs に
  `https://app.genba-profit-cloud.jp` を追加（確認メールのリンク先）

### 8. /app noindex確認
- `view-source:https://app.genba-profit-cloud.jp/app` に `noindex, nofollow` がある
- `/login` `/signup` も同様

### 9. sitemap確認
- `https://genba-profit-cloud.jp/sitemap.xml` のURLがすべて `genba-profit-cloud.jp` 始まり
- LP7ページのみ（/app /login /signup が含まれない）

### 10. robots確認
- `https://genba-profit-cloud.jp/robots.txt` → `/app` `/api` がDisallow、SitemapのURLが本番ドメイン

### 11. OGP確認
- `https://genba-profit-cloud.jp/ogp.png` が表示される
- og:url / og:image が本番ドメインになっている（SNSシェアデバッガーで確認）

### 12. Stripe callback URL更新（課金導入時）
- Checkout success/cancel URL: `https://app.genba-profit-cloud.jp/...`
- Webhookエンドポイント: `https://app.genba-profit-cloud.jp/api/stripe/webhook`（実装時）
- カスタマーポータルのリンク先も同様

## 将来の完全分離（任意）

トラフィック増加後、LPとアプリを別Vercelプロジェクトに分ける場合:
1. リポジトリを分割（またはmonorepo化）し、`app/(marketing)` をLPプロジェクトへ
2. アプリ側で `/app` プレフィックスを外す場合は `next.config.ts` に
   `rewrites: [{ source: "/:path((?!app|api|_next).*)", destination: "/app/:path" }]` を追加
   （詳細はREADME「/app プレフィックスの外し方」）
3. middleware.ts のリダイレクトは不要になるため削除
