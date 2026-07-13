# 現場収支クラウド

建設・内装・設備・リフォーム・外構・電気工事・水道工事など、**現場系事業者向けの案件別収支管理SaaS**。

> 案件を作る → 写真をアップロードする → AIが金額を読み取る → 利益が見える

- **サービス名は仮**です。`.env` の `NEXT_PUBLIC_APP_NAME` でいつでも変更できます。
- **APIキー・Supabaseが未設定でも全機能が動作**します（デモモード: ブラウザ内保存 + モックOCR）。
- **LP（販売サイト）とアプリ（管理システム）はルーティング・レイアウト・コンポーネントを完全分離**しています。

---

## セットアップ

```bash
npm install
npm run dev        # http://localhost:3000
```

- `/` … 販売用LP
- `/demo` … デモ紹介ページ →「デモ管理画面を開く」で `/app?demo=true`
- `/app` … 管理システム（未ログイン時は `/login` へ。`?demo=true` ならデモセッションを自動開始）

### 本番モードの使い方

1. `.env.example` を `.env.local` にコピー
2. Supabaseプロジェクトを作成し、`supabase/schema.sql` をSQL Editorで実行
3. Storageで `documents` バケット（非公開）を作成
4. （推奨）`supabase/storage-company-assets.sql` を実行 → 会社ロゴ用の公開バケットを作成
5. `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定 → メール認証・画像ストレージが有効化
6. `ANTHROPIC_API_KEY`（または `OPENAI_API_KEY`）を設定 → AI OCRが実読み取りに切り替わる
7. Vercelへデプロイ（環境変数を同様に設定）→ `/signup` で会社登録して利用開始

### デモモードの使い方

環境変数なしで `npm run dev` → `/app?demo=true` を開くだけ。
サンプル会社・案件・収支・書類入りで全機能を試せる（ブラウザ内保存・実APIは呼ばない）。
LPの「デモを見る」→「デモ管理画面を開く」からも同じ画面に入れる。

### 主な機能

案件管理（月別一覧・ボード・カレンダー・詳細3タブ）／売上・原価（外注費・材料費・経費）管理／
利益・利益率の自動計算（赤字・低利益の警告）／レシート・請求書の**AI OCR読み取り**（写真から半自動登録）／
書類保管（Storage + 署名URLプレビュー）／見積書・請求書（明細・A4帳票・領収書発行・売上連動）／
会社設定（帳票の発行元・振込先・ロゴ）／メンバー管理（権限4種 + RLS）／デモモード

---

## LPとアプリの分離構成

### ルーティング（URLにルートグループ名は出ない）

```
app/
├── (marketing)/        # LP側（SEO対象・MarketingHeader/Footer）
│   ├── layout.tsx      #   LP用metadata（index許可・OGP）
│   ├── page.tsx        #   / …… LPトップ（セクション合成のみ）
│   ├── features/       #   /features
│   ├── pricing/        #   /pricing
│   └── demo/           #   /demo …… デモ紹介（管理画面そのものは置かない）
├── (auth)/             # 認証（LPともアプリとも独立したAuthLayout）
│   ├── login/          #   /login
│   └── signup/         #   /signup
├── (dashboard)/        # アプリ側（noindex・AppSidebar/AppHeader/下部ナビ）
│   └── app/            #   /app 配下すべて（ダッシュボード〜設定）
└── api/ocr/            # AI OCRエンドポイント
```

### コンポーネント（LP用とアプリ用を混在させない）

```
components/
├── marketing/           # LP専用（アプリからimport禁止）
│   ├── marketing-header.tsx / marketing-footer.tsx
│   ├── mocks.tsx        # スクリーンショット風モック（実操作なし）
│   ├── reveal.tsx
│   └── sections/        # HeroSection / ProblemSection / SolutionSection /
│                        # FeatureSection / ScreenMockSection / IndustrySection /
│                        # PricingSection / FaqSection / FinalCtaSection
├── app/                 # アプリ専用（LPからimport禁止）
│   ├── app-shell.tsx    # 認証ガード + demo=true自動デモ開始
│   ├── app-sidebar.tsx / app-header.tsx / mobile-nav.tsx / app-page-header.tsx
│   ├── project-card.tsx / project-table.tsx / stat-card.tsx
│   ├── document-upload-box.tsx / project-selector.tsx / doc-thumb.tsx
│   ├── profit-badge.tsx / status-badge.tsx / monthly-chart.tsx
│   ├── project-form.tsx / revenue-form.tsx / cost-form.tsx
│   └── line-items-editor.tsx / print-doc.tsx
├── auth/                # 認証専用
│   ├── auth-layout.tsx / login-form.tsx / signup-form.tsx
└── shared/              # 両方で使う共通部品
    ├── button / card / badge / input / select / dialog / toast など
    ├── logo.tsx         # Logo / BrandMark
    ├── currency-text.tsx（¥1,234,567表示）/ date-text.tsx
```

### lib（責務分離）

```
lib/
├── shared/    # 共通処理（金額・日付・税計算 / サービス設定 / URLヘルパー）
│   ├── format.ts   config.ts   urls.ts   utils.ts
├── app/       # アプリ用（収支計算・ストア・OCR・Supabase・ルート定義）
│   ├── calc.ts  store.ts  demo-data.ts  assign.ts  ocr.ts  ocr-shared.ts
│   ├── constants.ts  types.ts  supabase.ts  routes.ts
└── marketing/ # LP用コンテンツ（料金・FAQ・業種）
    └── content.ts
```

---

## 将来のドメイン分離方針（重要）

現在は**単一VercelプロジェクトでLPとアプリを同居**（ルーティング・レイアウト・コンポーネントは分離済み）。
将来的に**別ドメイン**で運用する前提の設計です。**Stripe課金を有効化する前にドメインを確定させること**
（Checkout/Webhook のcallback URLがドメインに依存し、後から変えると再設定になるため）。

| | 想定ドメイン | SEO |
|---|---|---|
| LP | `https://genba-profit-cloud.jp` | **対象**（index許可・OGP・sitemap掲載） |
| アプリ | `https://app.genba-profit-cloud.jp` | **対象外**（noindex。`robots.ts` でも `/app` をdisallow） |

具体的な移行手順は **[docs/domain-checklist.md](docs/domain-checklist.md)** を参照。

### URLはハードコードしない

CTA・ヘッダー・フッター・法務ページのURLはすべて **`lib/urls.ts`** のヘルパー経由です
（`marketingUrl / appUrl / loginUrl / signupUrl(plan?) / demoUrl / appDashboardUrl /
pricingUrl / termsUrl / privacyUrl / commercialLawUrl / contactEmail`）。

```bash
# 現在のVercel運用
NEXT_PUBLIC_MARKETING_URL=https://genba-profit-cloud.vercel.app
NEXT_PUBLIC_APP_URL=https://genba-profit-cloud.vercel.app/app

# 将来の本番ドメイン運用（この2行を変えて再デプロイするだけ）
NEXT_PUBLIC_MARKETING_URL=https://genba-profit-cloud.jp
NEXT_PUBLIC_APP_URL=https://app.genba-profit-cloud.jp
```

- 切り替えると、無料で試す／ログイン／デモ／sitemap／OGP／canonicalの全URLが自動で追従する
- 認証（/login /signup）は**アプリ側ドメインに属する**（`loginUrl()` / `signupUrl()` が吸収）
- ログイン成功後の遷移は同一プロジェクト内の相対パス（`appPath()` = `/app`）のため、
  どちらのドメイン構成でもそのまま動く

### middleware.ts によるドメイン振り分け

`NEXT_PUBLIC_MARKETING_URL` と `NEXT_PUBLIC_APP_URL` の**ホストが異なるときだけ**動作:

- LPドメインで `/app` `/login` `/signup` → アプリドメインへ308リダイレクト
- アプリドメインで `/features` `/pricing` `/terms` 等のLPページ → LPドメインへ308リダイレクト
- アプリドメインの `/` → `/app`（未ログインならAppShellが `/login` へ）
- **同一ホスト（現在のVercel）・環境変数未設定・localhostでは一切動作しない**（ループ防止）

### /app プレフィックスの外し方（分離後）

アプリ側プロジェクトでは2通りのどちらかで対応できます。

1. `lib/app/routes.ts` の `APP_BASE_PATH` を `""` に変更（ナビはこの定数を参照）
2. またはページを触らず、アプリ側の `next.config` にrewriteを追加:
   ```js
   rewrites: async () => [
     { source: "/:path((?!app|api|_next).*)", destination: "/app/:path" },
   ]
   ```

### 分離時にやること

- リポジトリを `apps/lp`（(marketing) + (auth)なし）と `apps/app`（(dashboard) + (auth) + api）へ分割
- それぞれに `components/shared` と `lib/shared` をコピーまたはパッケージ化
- 両プロジェクトに `NEXT_PUBLIC_MARKETING_URL` / `NEXT_PUBLIC_APP_URL` を設定
- アプリ側は全体をnoindex（`robots.ts` で `disallow: "/"`）

---

## 技術構成

| 領域 | 技術 |
|---|---|
| フレームワーク | Next.js 16（App Router / Turbopack） + TypeScript |
| スタイル | Tailwind CSS v4 + 自作shadcn/ui風コンポーネント |
| アニメーション | Framer Motion（LPのみ） |
| バックエンド | Supabase（Auth / DB / Storage / RLS）※未設定時はデモモード |
| AI OCR | Claude Vision API（第一候補）→ OpenAI Vision → モック解析 |
| PDF | ブラウザ印刷ベースのA4帳票（`@media print` + `.print-area`） |
| PWA | `manifest.webmanifest` + SVGアイコン |

### デモモード（/app?demo=true）

- LP・デモページの「デモ管理画面を開く」から遷移すると、セッションが無い場合に**デモセッションを自動開始**
- サンプル案件9件・レシート・請求書入り。日付は常に「今日」基準で生成
- データは**ブラウザのlocalStorageのみ**（サーバー保存なし）
- アプリヘッダーに「デモモード」表示と「本番利用を開始する」ボタン（/signupへ）を表示
- OCRはモック解析（`ANTHROPIC_API_KEY` 設定で実読み取り）

---

## 画面一覧

### LP側（SEO対象・sitemap掲載）
| パス | 内容 |
|---|---|
| `/` | LP（ヒーロー・課題・5ステップ・機能9・画面モック・業種8・料金・FAQ・CTA、JSON-LD付き） |
| `/features` | 機能詳細 |
| `/pricing` | 料金 + プラン比較表（プラン定義は `lib/billing/plans.ts`） |
| `/demo` | デモ紹介（試せること・注意書き・デモ管理画面を開く） |
| `/terms` `/privacy` `/commercial-law` | 利用規約・プライバシーポリシー・特商法（ドラフト。フッターからリンク） |

### 認証
| パス | 内容 |
|---|---|
| `/login` `/signup` | 左: サービス説明 / 右: フォーム + デモログインボタン |

### アプリ側（noindex）
| パス | 内容 |
|---|---|
| `/app` | 写真登録へリダイレクト（現場ユーザーの入口） |
| `/app/dashboard` | 経営レポート（旧ダッシュボード。設定>詳細設定からアクセス） |
| `/app/documents/upload` | 写真から登録（AI読み取りウィザード・最重要導線） |
| `/app/projects` `/new` `/board` `/[id]` | 月別の案件一覧・作成・ボード・詳細（収支/写真・書類/メモの3タブ） |
| `/app/calendar` | 工期・請求・入金カレンダー |
| `/app/documents` `/upload` | 書類一覧・写真から登録（AI読み取りウィザード） |
| `/app/revenues` `/app/costs` | 売上・原価一覧 |
| `/app/estimates` `/app/invoices`（+ `/new` `/[id]`） | 見積・請求（A4帳票PDF・領収書発行） |
| `/app/settings` `/members` | 会社設定・メンバー管理 |

---

## .envに必要な環境変数

```bash
NEXT_PUBLIC_APP_NAME=現場収支クラウド   # サービス名（あとで変更可）
NEXT_PUBLIC_MARKETING_URL=             # LP側URL（SEO/OGP・分離後のCTA切替に使用）
NEXT_PUBLIC_APP_URL=                   # アプリ側URL（分離後に設定）
NEXT_PUBLIC_SUPABASE_URL=              # ─┐ 未設定ならデモモード
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # ─┘
ANTHROPIC_API_KEY=                     # AI OCR第一候補（Claude Vision）
OCR_MODEL=                             # 省略時 claude-opus-4-8
OPENAI_API_KEY=                        # AI OCR第二候補
NEXT_PUBLIC_CONTACT_EMAIL=             # 「相談する」CTA・法務ページの窓口（省略時は仮アドレス）
NEXT_PUBLIC_OPERATOR_NAME=             # 運営事業者名（省略時: 株式会社サイプレス）
NEXT_PUBLIC_STRIPE_PRICE_LIGHT=        # ─┐ Stripe接続時にPrice IDを設定
NEXT_PUBLIC_STRIPE_PRICE_STANDARD=     #  │（未設定でも表示・導線は動作）
NEXT_PUBLIC_STRIPE_PRICE_PRO=          # ─┘
```

## AI OCR（本実装）

`/api/ocr` は本番モードで次の流れで動く（`app/api/ocr/route.ts`）。

1. クライアントが `filePath`（Storageパス）+ `documentId` + ユーザーJWTを送信
2. サーバーがユーザーJWTスコープのSupabaseクライアントで**Storageから原本を取得**
   （RLSが効くため他社のファイル・書類は扱えない。取得失敗時はクライアント縮小画像で続行）
3. `ANTHROPIC_API_KEY` あり → **Claude Vision**（`OCR_MODEL`、省略時 `claude-opus-4-8`）。
   PDFもClaudeのdocumentブロックでそのまま解析できる
4. なければ `OPENAI_API_KEY` → OpenAI Vision（gpt-4o-mini。PDF非対応）
5. 抽出はsnake_case JSON（取引先・宛名・日付・支払期限・請求書番号・インボイス登録番号・
   合計/税額/小計・明細・支払方法・推定登録先・推定経費カテゴリ・信頼度・全文）。
   `normalizeOcr` が表記ゆれを内部型へ正規化する
6. 成功時はサーバーが `documents` の `ocr_text / ai_json / vendor_name / document_date /
   total_amount / tax_amount / assignment_confidence / status=needs_review` を更新
7. **失敗・未設定時は必ず200 + モック/手入力フォールバック**。
   本番モードでの失敗時はサンプル値をフォームやDBへ流し込まず、空フォームで手入力登録に進む
8. デモモード（`/app?demo=true`）は実APIを呼ばず、常にクライアント側モックで動く
9. 読み取り結果は必ず**確認画面**を経由（自動登録しない）。すべての項目を編集できる

## Supabaseテーブル（`supabase/schema.sql`）

companies / profiles / projects / revenues / costs / documents /
estimates + estimate_items / invoices + invoice_items

RLS: `current_company_id()` により全テーブルを会社単位で分離。viewerロールは書き込み不可。

### Storageバケット

| バケット | 公開 | 用途 | 作成方法 |
|---|---|---|---|
| `documents` | 非公開 | 書類（レシート・請求書等）の原本。署名URLで表示 | ダッシュボードで作成（ポリシーは `schema.sql`） |
| `company-assets` | 公開 | 会社ロゴ。公開URLで配信 | `supabase/storage-company-assets.sql` を実行（未作成でもdocumentsへ自動フォールバック） |

パスはどちらも `{company_id}/...` で始まり、RLSポリシーで自社フォルダのみ書き込み可。

### 課金プラン（Stripe導入準備）

- プラン定義は `lib/billing/plans.ts`（価格・上限・Stripe Price IDの単一ソース）
- `/pricing` の「無料で試す」→ `/signup?plan=light|standard|pro` でプランを引き継ぎ、
  サインアップ時に `user_metadata.plan` として保存（Stripe接続時に初期プランとして使用）
- Stripe API接続は未実装。接続時は Price ID を環境変数に設定し、Checkout導線を追加する

---

## Supabase移行状況

- **[済] 全エンティティ移行完了** — projects / revenues / costs / documents /
  estimates / invoices / **company（会社設定）** / **members（profiles）** の
  一覧取得・作成・編集・削除がDB保存（`lib/app/supabase-store.ts`）。
  ローカルキャッシュへ楽観反映→バックグラウンドでwrite-through同期（直列キューで実行順を保証）。
  失敗時はトースト+該当エンティティのDB再取得でUIを戻す。
  案件詳細・案件一覧・ダッシュボードの収支は `lib/app/calc.ts` がこのキャッシュから自動計算するため、
  すべてSupabase上の実データ連動になる。
- **会社設定・メンバー** — 会社情報（帳票の発行元・振込先・インボイス番号・ロゴ）は
  companies テーブルへ、メンバーは profiles テーブルをそのまま利用。
  ロゴは `company-assets` バケット（`supabase/storage-company-assets.sql` で作成・公開URL配信）へ保存。
  バケット未作成でも documents バケットへ自動フォールバックし署名URLで表示される。
  共通アクセサは `getCurrentProfile / getCurrentUserRole / getCurrentCompanyId / getCurrentCompany`
  （プロビジョニングは単一フライトで重複会社作成を防止）。
  権限制御は `lib/app/permissions.ts`（owner/admin=会社設定・メンバー管理、staff=データ編集のみ、
  viewer=閲覧のみ。サーバー側はRLSが最終防衛線）。メンバー招待メールは準備中（UIで案内）。
- **見積・請求の明細** — `estimate_items` / `invoice_items` を親と同期
  （作成時insert・編集時は全置換・親削除時はFK cascade。取得は明細埋め込みSELECT + sort_order順）。
  税率は `lib/shared/format.ts` の `TAX_RATE` / `taxFromSubtotal` に集約（変更はここ1か所）。
  請求書→売上への反映はメモの請求書番号で紐づけ、二重反映を防止。A4帳票は `components/app/print-doc.tsx`。
- **書類ファイル（Storage）** — 本番モードでは原本を非公開バケット `documents` へ保存。
  パスは `{company_id}/projects/{project_id}/documents/{timestamp}-{filename}`
  （案件未定は `{company_id}/unassigned/documents/...`）。
  StorageのRLSポリシーが「第1フォルダ = 会社ID」を要求するため、パスは必ず会社IDから始める。
  プレビューは `getDocumentSignedUrl`（署名URL・60分・50分キャッシュ）で行う。
  対応形式は jpg / jpeg / png / webp / pdf、上限10MB（`lib/app/upload.ts`）。
  書類削除時はStorageのファイルも削除する。デモモードはアップロードせずローカルサムネイルのみ。
- **[未] estimates / invoices / members / company**
  → `supabase-store.ts` に `sp〇〇` を追加し `data-store.ts` の `supabaseStore` に割り当てるだけで順次移行可能
- ストア選択: **Supabase設定済み + supabaseセッション → supabaseStore ／ それ以外（`/app?demo=true` 含むデモ）→ demoStore**
- 本番モードとデモモードはlocalStorage名前空間を分離（デモ操作が実データ表示に混ざらない）
- 初回ログイン時、プロフィール未作成なら会社+プロフィールを自動作成（自己修復）

## 今後の予定

- Stripe課金の本接続（Checkout・プラン上限の実装。土台は `lib/billing/plans.ts` に準備済み）
- メンバー招待メール（Supabase Auth Admin invite。UIは準備中表示で用意済み）
- Realtime購読への置き換え（複数端末の同期）
- freee / マネーフォワードCSV連携、過去案件CSVインポート
- 銀行API連携・入金自動消込
- 協力会社招待・発注書送付、工程表・写真台帳
- プッシュ通知（期日超過・未確認書類）、Service Worker
- お問い合わせフォーム（現在はメールCTA）

## デプロイ前チェックリスト

- [x] Supabase `schema.sql` 適用・`documents` バケット作成・RLS動作確認
- [x] `ANTHROPIC_API_KEY` 設定とOCR精度確認（本番URLで実証済み）
- [x] OGP画像（`public/ogp.png`）・favicon・og:image/og:url設定
- [x] 料金プランの整備（`lib/billing/plans.ts`）
- [x] 特商法・プライバシーポリシー・利用規約ページ（ドラフト）
- [x] `/app` noindex・robots.txt Disallow・sitemapはLP側のみ
- [ ] `NEXT_PUBLIC_MARKETING_URL`（および分離後は `NEXT_PUBLIC_APP_URL`）を本番ドメインに設定
- [ ] `NEXT_PUBLIC_CONTACT_EMAIL` / `NEXT_PUBLIC_OPERATOR_NAME` を正式な値に設定
- [ ] 特商法の所在地・連絡先を正式情報へ差し替え（法務確認）
- [ ] `supabase/storage-company-assets.sql` の適用（会社ロゴの公開URL配信）
- [ ] 印刷（PDF）表示確認・Lighthouse計測

## スクリプト

```bash
npm run dev     # 開発サーバー
npm run build   # 本番ビルド（型チェック込み）
npm run start   # 本番サーバー
```
