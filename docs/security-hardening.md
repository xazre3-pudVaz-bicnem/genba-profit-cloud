# セキュリティ監査と強化（2026-07）

顧客増加に備えた情報漏洩・不正アクセス対策の徹底調査。3系統（RLS/テナント分離、APIルート/濫用、クライアント権限/XSS/依存）を独立監査し、重大な穴を修正した。

このアプリはアクセス制御の最終防壁が **Supabase RLS のみ**（サーバー側の認可ゲートは持たない設計）。したがって RLS の穴は即座に全面侵害につながる。今回の最重要修正はその RLS の穴を塞ぐこと。

---

## 修正済み（このコミットに含まれる）

| # | 深刻度 | 内容 | 修正 |
|---|--------|------|------|
| 1 | **重大** | `profiles` UPDATE に `WITH CHECK` が無く、ログインユーザーが自分の行の `company_id`・`role` を書き換え可能だった。→ 他社テナントへ乗り移り／自分を owner へ昇格でき、全社データを読み書きできた。 | `supabase/migration-security-hardening.sql`：`profiles_update` に `WITH CHECK` を追加（company_id は自社固定、role は owner/admin のみ変更可、本人は role 据え置き時のみ許可） |
| 2 | **重大** | `profiles` INSERT が `id=auth.uid()` のみで、`company_id`・`role` を自由指定できた。→ 退職者（auth.users は残る）が元会社へ owner で再登録できた。 | 同SQL：`profiles_insert` を「メンバー未登録の会社に owner でのみ参加可」に厳格化（`company_has_members()` ヘルパー） |
| 3 | 高 | `estimate_items`／`invoice_items`／`purchase_order_items` にロール判定が無く、閲覧のみ(viewer)が明細金額を直接改ざんできた。 | 同SQL：SELECT は全ロール、INSERT/UPDATE/DELETE は owner/admin/staff に限定 |
| 4 | **重大** | `/api/ocr` が未認証・無制限で、誰でも画像を投げて Claude/OpenAI の課金を発生させられた（APIコスト枯渇＝denial-of-wallet）。 | `app/api/ocr/route.ts`：JWTを `getUser()` で検証し、無効なら 401。有料API呼び出し前にゲート。リクエスト全体12MB・フォールバック画像~6MBの上限も追加 |
| 5 | 高 | セキュリティヘッダー未設定（クリックジャッキング等に無防備）。 | `next.config.ts`：CSP `frame-ancestors 'none'`、X-Frame-Options、HSTS、X-Content-Type-Options、Referrer-Policy、Permissions-Policy を全レスポンスに付与 |
| 6 | 中 | ロゴに SVG を許可しており、`<script>` 入り SVG による保存型XSSの温床だった。 | `lib/app/upload.ts`：ロゴ許可形式から svg を除外（jpg/png/webp のみ） |
| 7 | 高 | `next@16.2.10` に既知脆弱性（App Router のミドルウェアバイパス、rewrites の SSRF 等）。 | `next@16.2.11` へ更新済み |

### 良かった点（設計として正しく守られていた）
- サービスロールキーはコードで一切未使用。OCRルートも anon キー + ユーザーJWT で動くため RLS が常に効く。
- 機密キー（ANTHROPIC/OPENAI）は `NEXT_PUBLIC_` 化されておらず、Node ランタイムのルート内のみで参照。クライアントバンドルに出ない。`.env.local` は gitignore 済み。
- `documents` バケットは非公開＋会社フォルダ単位RLS＋短命署名URL。パストラバーサルはRLSで遮断。
- デモ／本番のデータ分離が厳格（localStorage名前空間分離、`?demo=true` は実APIを呼ばない）。ログアウトでキャッシュ・セッションを確実に破棄。
- ユーザー入力はReactで自動エスケープ。`dangerouslySetInnerHTML` は静的JSON-LDのみでXSSシンク無し。SSRF・オープンリダイレクト無し。

---

## 要対応（ユーザー側で実行が必要）

### A. RLSマイグレーションの適用【最優先・必須】
Supabaseダッシュボード → SQL Editor で **`supabase/migration-security-hardening.sql`** を実行する。
冪等（何度実行してもエラーにならず既存データを消さない）。適用後、devtools等から以下が **失敗** することを確認：
```sql
update profiles set role='owner' where id='<自分のUID>';        -- WITH CHECK 違反で失敗するのが正
update profiles set company_id='<他社ID>' where id='<自分のUID>'; -- 同上
```
> 適用するまで #1・#2・#3 の穴は開いたまま（コード側だけでは塞げない、DB側の設定のため）。

### B. 残りの依存パッチ（ローカルで実行 → コミット）
今回の環境ではネットワーク取得が制限され自動適用できなかったもの：
```bash
# postcss / sharp を安全版へ（package.json に overrides を追加して適用）
npm pkg set overrides.sharp="^0.35.3" overrides.postcss="^8.5.23"
npm install
# xlsx（SheetJSは npm レジストリに修正版が無い。公式CDNの修正版へ差し替え）
npm install "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
npm run build   # 通ることを確認してコミット
```
- `sharp <0.35.0` / `postcss <=8.5.17`：主にビルド時の脆弱性。上記 overrides で解消。
- `xlsx@0.18.5`：プロトタイプ汚染・ReDoS。影響範囲はアップロードした本人のブラウザ内に限定されるが、公式修正版（≥0.20.2）へ差し替え推奨。使用APIは互換のため差し替えのみでよい。

---

## 今後の推奨（任意・多層防御）
- RLS のクロステナント自動テスト（別会社ユーザーで相手データにアクセスできないことをCIで検証）。RLSが唯一の防壁なので回帰検知が重要。
- `company-assets` バケットは公開かつパスに company_id を含むため会社IDが露出する。#1修正で悪用経路は塞がれたが、非公開バケット＋署名URLへの移行が望ましい。
- Supabaseセッション(JWT)は localStorage 保存（supabase-js既定）。将来XSSが入ると増幅されるため、可能なら `@supabase/ssr` の httpOnly Cookie 方式へ。
- `/api/ocr` に会社単位のレート制限・月次上限（例：Upstash Ratelimit）。#4で未認証濫用は塞いだが、認証済みユーザーの過剰利用対策として。
- `companies` INSERT は認証済みなら誰でも可（プロビジョニング用）。スパム対策としてRPC経由に限定する余地あり。
