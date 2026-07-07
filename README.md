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

### 本番構成（任意）

1. `.env.example` を `.env.local` にコピー
2. Supabaseプロジェクトを作成し、`supabase/schema.sql` をSQL Editorで実行
3. Storageで `documents` バケット（非公開）を作成
4. `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定 → メール認証・画像ストレージが有効化
5. `ANTHROPIC_API_KEY`（または `OPENAI_API_KEY`）を設定 → AI OCRが実読み取りに切り替わる
6. Vercelへデプロイ（環境変数を同様に設定）

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

現在は**単一Next.jsプロジェクト内でLPとアプリをルーティング分離**していますが、
将来的に**別Vercelプロジェクト・別ドメイン**へ分離する前提の設計です。

| | 想定ドメイン | SEO |
|---|---|---|
| LP | `https://genba-profit-cloud.jp` | **対象**（index許可・OGP・構造化データ） |
| アプリ | `https://app.genba-profit-cloud.jp` | **対象外**（noindex。`robots.ts` でも `/app` をdisallow） |

### URLはハードコードしない

LP→アプリのCTAリンクはすべて `lib/shared/urls.ts` のヘルパー経由です。

```
NEXT_PUBLIC_MARKETING_URL   # LP側URL（例: https://genba-profit-cloud.jp）
NEXT_PUBLIC_APP_URL         # アプリ側URL（例: https://app.genba-profit-cloud.jp）
```

- 未設定（現在）: `appUrl()` → `/app`、`appAuthUrl("/login")` → `/login`
- 分離後: 環境変数を設定するだけで、無料で試す／ログイン／デモの全CTAが別ドメインへ切り替わる
- 認証（/login /signup）は**アプリ側ドメインに属する**想定（`appAuthUrl` が吸収）

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

### LP側（SEO対象）
| パス | 内容 |
|---|---|
| `/` | LP（ヒーロー・課題・5ステップ・機能9・画面モック・業種8・料金・FAQ・CTA、JSON-LD付き） |
| `/features` | 機能詳細 |
| `/pricing` | 料金 + プラン比較表 |
| `/demo` | デモ紹介（試せること・注意書き・デモ管理画面を開く） |

### 認証
| パス | 内容 |
|---|---|
| `/login` `/signup` | 左: サービス説明 / 右: フォーム + デモログインボタン |

### アプリ側（noindex）
| パス | 内容 |
|---|---|
| `/app` | ダッシュボード（今月の売上/原価/粗利/利益率・未請求・未入金・進行中/赤字案件・未処理レシート + 要対応パネル6種） |
| `/app/projects` `/new` `/board` `/[id]` | 案件一覧・作成・ボード・詳細（9タブ） |
| `/app/calendar` | 工期・請求・入金カレンダー |
| `/app/documents` `/upload` | 書類一覧・写真から登録（AI読み取りウィザード） |
| `/app/revenues` `/app/costs` | 売上・原価一覧 |
| `/app/estimates` `/app/invoices`（+ `/new` `/[id]`） | 見積・請求（A4帳票PDF・領収書発行） |
| `/app/settings` `/members` | 会社設定・メンバー管理 |

---

## .envに必要な環境変数

```bash
NEXT_PUBLIC_APP_NAME=現場収支クラウド   # サービス名（あとで変更可）
NEXT_PUBLIC_MARKETING_URL=             # LP側URL（分離後に設定）
NEXT_PUBLIC_APP_URL=                   # アプリ側URL（分離後に設定）
NEXT_PUBLIC_SUPABASE_URL=              # ─┐ 未設定ならデモモード
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # ─┘
ANTHROPIC_API_KEY=                     # AI OCR第一候補（Claude Vision）
OCR_MODEL=                             # 省略時 claude-opus-4-8
OPENAI_API_KEY=                        # AI OCR第二候補
```

## OCR / APIキー未設定時の動作

1. `ANTHROPIC_API_KEY` あり → Claude Visionで実読み取り
2. なければ `OPENAI_API_KEY` → OpenAI Vision（gpt-4o-mini）
3. どちらもなし／API失敗 → **モック解析**（自然なサンプル値 + 未設定の案内表示）
4. 読み取り結果は必ず**確認画面**を経由（半自動）。手入力での修正・登録も常に可能

## Supabaseテーブル（`supabase/schema.sql`）

companies / profiles / projects / revenues / costs / documents /
estimates + estimate_items / invoices + invoice_items

RLS: `current_company_id()` により全テーブルを会社単位で分離。viewerロールは書き込み不可。
Storageは `{company_id}/...` パスで分離。

---

## Supabase移行状況

- **[済] projects / revenues / costs / documents** — 一覧取得・作成・編集・削除がDB保存（`lib/app/supabase-store.ts`）。
  ローカルキャッシュへ楽観反映→バックグラウンドでwrite-through同期（直列キューで実行順を保証）。
  失敗時はトースト+該当エンティティのDB再取得でUIを戻す。
  案件詳細・案件一覧・ダッシュボードの収支は `lib/app/calc.ts` がこのキャッシュから自動計算するため、
  すべてSupabase上の実データ連動になる。
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

## 今後追加すべき機能

- Supabase移行の残りエンティティ（上記[未]）と Realtime購読への置き換え
- freee / マネーフォワードCSV連携、過去案件CSVインポート
- 銀行API連携・入金自動消込
- 協力会社招待・発注書送付、工程表・写真台帳
- プッシュ通知（期日超過・未確認書類）、Service Worker
- Stripe課金（プラン制限の実装）
- お問い合わせフォーム・特商法/規約/プライバシーページ

## デプロイ前チェックリスト

- [ ] `NEXT_PUBLIC_MARKETING_URL`（および分離後は `NEXT_PUBLIC_APP_URL`）を本番ドメインに設定
- [ ] `NEXT_PUBLIC_APP_NAME` を正式サービス名に変更
- [ ] Supabase `schema.sql` 適用・`documents` バケット作成・RLS動作確認
- [ ] `ANTHROPIC_API_KEY` 設定とOCR精度確認（設定画面の接続状態で確認可能）
- [ ] OGP画像（1200×630）の用意
- [ ] 料金（`lib/marketing/content.ts`）の正式金額への更新
- [ ] 特商法・プライバシーポリシー・利用規約ページの追加
- [ ] 印刷（PDF）表示確認・Lighthouse計測

## スクリプト

```bash
npm run dev     # 開発サーバー
npm run build   # 本番ビルド（型チェック込み）
npm run start   # 本番サーバー
```
