# 現場収支クラウド

建設・内装・設備・リフォーム・外構・電気工事・水道工事など、**現場系事業者向けの案件別収支管理SaaS**。

> 案件を作る → 写真をアップロードする → AIが金額を読み取る → 利益が見える

- **サービス名は仮**です。`.env` の `NEXT_PUBLIC_APP_NAME` でいつでも変更できます。
- **APIキー・Supabaseが未設定でも全機能が動作**します（デモモード: ブラウザ内保存 + モックOCR）。

---

## セットアップ

```bash
npm install
npm run dev        # http://localhost:3000
```

ログイン画面の「**デモモードで試す**」を押すと、サンプルデータ入りの管理画面がすぐに開きます。

### 本番構成（任意）

1. `.env.example` を `.env.local` にコピー
2. Supabaseプロジェクトを作成し、`supabase/schema.sql` をSQL Editorで実行
3. Storageで `documents` バケット（非公開）を作成
4. `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定 → メール認証・画像ストレージが有効化
5. `ANTHROPIC_API_KEY`（または `OPENAI_API_KEY`）を設定 → AI OCRが実読み取りに切り替わる
6. Vercelへデプロイ（環境変数を同様に設定）

---

## 技術構成

| 領域 | 技術 |
|---|---|
| フレームワーク | Next.js 16（App Router / Turbopack） + TypeScript |
| スタイル | Tailwind CSS v4 + 自作shadcn/ui風コンポーネント |
| アニメーション | Framer Motion（LP） |
| バックエンド | Supabase（Auth / DB / Storage / RLS）※未設定時はデモモード |
| AI OCR | Claude Vision API（第一候補）→ OpenAI Vision → モック解析 |
| PDF | ブラウザ印刷ベースのA4帳票（`@media print` + `.print-area`） |
| PWA | `manifest.webmanifest` + SVGアイコン（standalone起動対応） |

### データ層の設計（SaaS化しやすい構造）

UIはすべて `lib/store.ts` のCRUD関数だけを呼びます。現在はlocalStorage永続化のデモストアですが、
関数シグネチャを維持したままSupabaseクエリへ差し替え可能です（`supabase/schema.sql` はUIの型と1:1対応）。
認証・ストレージアップロードはSupabase設定時に自動で有効になります。

---

## 作成したページ一覧

### 公開ページ
| パス | 内容 |
|---|---|
| `/` | 販売用LP（課題提起・5ステップ・機能・画面イメージ・業種別・料金・FAQ・CTA、JSON-LD付き） |
| `/features` | 機能詳細（モックUI付きの5大機能 + その他機能） |
| `/pricing` | 料金プラン + 機能比較表 + FAQ |
| `/demo` | デモ紹介（登録不要でデモ開始） |
| `/login` / `/signup` | 認証（Supabase or デモモード） |

### アプリ画面（`/app` 配下・noindex）
| パス | 内容 |
|---|---|
| `/app` | ダッシュボード（今月のKPI 13種・月次チャート・要対応リスト6パネル） |
| `/app/projects` | 案件一覧（検索・7種フィルタ・6種ソート・PC表/スマホカード切替） |
| `/app/projects/new` | 案件作成 |
| `/app/projects/[id]` | **案件詳細**（収支サマリー8指標 + 9タブ: 概要/売上/発注費/材料費/経費/書類/見積/請求/メモ） |
| `/app/projects/board` | 案件ボード（D&D + ボタンでステータス変更） |
| `/app/calendar` | カレンダー（工期・請求予定・入金予定、期日超過は赤表示） |
| `/app/documents` | 書類一覧（絞り込み・詳細ダイアログ・案件再割当・収支への登録） |
| `/app/documents/upload` | **写真から登録**（撮影→種別→AI読取→確認→完了の5ステップウィザード） |
| `/app/revenues` | 売上一覧（未請求/未入金フィルタ・入金のワンタップ記録） |
| `/app/costs` | 原価一覧（発注費/材料費/経費・未払い管理） |
| `/app/estimates` `/new` `/[id]` | 見積書の一覧・作成・詳細（A4帳票プレビュー + PDF） |
| `/app/invoices` `/new` `/[id]` | 請求書の一覧・作成・詳細（期限超過検知・領収書発行・売上自動連携） |
| `/app/settings` | 会社設定（帳票用の会社情報・ロゴ・振込先・接続状態・データ管理） |
| `/app/settings/members` | メンバー管理（4段階ロール） |
| `/api/ocr` | AI OCRエンドポイント（Claude → OpenAI → モックの優先フォールバック） |

---

## 主要コンポーネント一覧

```
components/
├── brand.tsx                  # BrandMark / BrandLogo（ロゴ）
├── ui/                        # 汎用UI（shadcn/ui風・自作）
│   ├── button / card / badge / input / textarea / select / label
│   ├── dialog.tsx             # Dialog + ConfirmDialog（スマホはボトムシート）
│   ├── tabs.tsx               # Tabs + FilterChips
│   ├── toast.tsx              # toast() + Toaster（グローバル通知）
│   ├── money-input.tsx        # 金額入力（テンキー・カンマ整形）
│   ├── segmented.tsx / table / empty-state / skeleton
├── app/                       # アプリ専用
│   ├── app-shell.tsx          # 認証ガード + レイアウト
│   ├── sidebar.tsx / mobile-nav.tsx（下部固定ナビ+中央FAB）/ page-header.tsx
│   ├── stat-card.tsx          # KPIカード
│   ├── monthly-chart.tsx      # 月次チャート(SVG・CVD検証済み配色・ツールチップ)
│   ├── status-badge.tsx / profit-badge.tsx / money.tsx
│   ├── project-table.tsx      # 案件一覧（表⇔カード自動切替）
│   ├── project-form.tsx / revenue-form.tsx / cost-form.tsx
│   ├── project-selector.tsx   # AI割り振り候補（信頼度・理由つき）
│   ├── doc-thumb.tsx          # 書類サムネイル（画像なし時はプレースホルダ）
│   ├── line-items-editor.tsx  # 見積/請求の明細行エディタ
│   └── print-doc.tsx          # A4帳票（見積書/請求書/領収書）
└── marketing/                 # LP用
    ├── site-header / site-footer / reveal（スクロールアニメ）
    ├── mocks.tsx              # 画面モック（ダッシュボード/ボード/OCRスマホ）
    ├── faq.tsx / demo-button.tsx
```

### lib（ビジネスロジック）

| ファイル | 役割 |
|---|---|
| `lib/types.ts` | 全ドメイン型（Supabaseテーブルと1:1） |
| `lib/constants.ts` | サービス名・ステータス定義・料金プラン・FAQ（一元管理） |
| `lib/format.ts` | **共通関数**: `yen()`（¥1,234,567形式）・`pct1()`（小数1桁%）・`calcTax()`（消費税）・日付フォーマット |
| `lib/calc.ts` | 収支自動計算（粗利・利益率・未請求・未入金・月次集計・ダッシュボード統計） |
| `lib/assign.ts` | 案件自動割り振りスコアリング（取引先履歴/宛名/住所/日付/コンテキスト） |
| `lib/store.ts` | リアクティブストア（CRUD・セッション・localStorage永続化） |
| `lib/demo-data.ts` | サンプルデータ（日付は常に「今日」基準で生成） |
| `lib/ocr.ts` `ocr-shared.ts` | 画像縮小・OCR呼び出し・正規化・モック解析 |
| `lib/supabase/client.ts` | Supabase接続（未設定ならnull＝デモモード） |

---

## Supabaseテーブル一覧（`supabase/schema.sql`）

| テーブル | 内容 |
|---|---|
| `companies` | 会社（帳票情報・振込先・ロゴ含む） |
| `profiles` | ユーザー（auth.usersと1:1、`role`: owner/admin/staff/viewer） |
| `projects` | 案件（ステータス・工期・タグ・カラー） |
| `revenues` | 売上（税区分・請求/入金日・ステータス） |
| `costs` | 原価（type: order/material/expense、経費カテゴリ・支払方法） |
| `documents` | 書類（OCR結果 `ai_json`・割り振り信頼度・登録先参照） |
| `estimates` + `estimate_items` | 見積書 + 明細 |
| `invoices` + `invoice_items` | 請求書 + 明細 |

**RLS**: `current_company_id()` ヘルパーにより全テーブルを会社単位で分離。
`viewer` ロールは書き込み不可。Storageも `{company_id}/...` パスで分離。

---

## .envに必要な環境変数

```bash
NEXT_PUBLIC_APP_NAME=現場収支クラウド   # サービス名（あとで変更可）
NEXT_PUBLIC_SITE_URL=                  # 本番URL（SEO/OGP用）
NEXT_PUBLIC_SUPABASE_URL=              # ─┐ 未設定ならデモモード
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # ─┘
ANTHROPIC_API_KEY=                     # AI OCR第一候補（Claude Vision）
OCR_MODEL=                             # 省略時 claude-opus-4-8（コスト重視なら claude-haiku-4-5）
OPENAI_API_KEY=                        # AI OCR第二候補
```

## OCR / APIキー未設定時の動作

1. `ANTHROPIC_API_KEY` あり → Claude Visionで実読み取り
2. なければ `OPENAI_API_KEY` → OpenAI Vision（gpt-4o-mini）
3. どちらもなし／API失敗 → **モック解析**（書類種別に応じた自然なサンプル値 + 「AI OCR未設定」の案内表示）
4. 通信自体が失敗してもクライアント側モックで継続。**手入力での修正・登録は常に可能**

読み取り結果は必ず**確認画面**を経由し、ユーザーが案件・金額・登録先を確認してから保存されます（半自動方式）。

---

## 今後追加すべき機能

- Supabase DB CRUDへの完全切替（ストア関数の差し替え。スキーマ・認証・Storageは実装済み）
- freee / マネーフォワードへのCSVエクスポート・API連携
- 過去案件のCSV一括インポート
- 銀行API連携による入金自動消込
- 協力会社の招待・発注書送付
- 工程表・写真台帳・電子小黒板
- 承認フロー・より細かい権限制御
- OCR精度向上（明細行の構造化・学習による案件推定の強化）
- プッシュ通知（期日超過・未確認書類）・Service Workerによる完全オフライン対応
- Stripe課金（プラン制限の実装）

## デプロイ前に確認すべき項目

- [ ] `NEXT_PUBLIC_SITE_URL` を本番ドメインに設定（OGP・sitemap・canonicalに反映）
- [ ] `NEXT_PUBLIC_APP_NAME` を正式サービス名に変更
- [ ] Supabaseの `schema.sql` 適用と `documents` バケット作成・RLS動作確認
- [ ] Supabase Authのメールテンプレート・リダイレクトURL設定
- [ ] `ANTHROPIC_API_KEY` の設定とOCR実読み取りの精度確認（設定画面の接続状態で確認可能）
- [ ] OGP画像（`/og-image.jpg` 1200×630）の用意
- [ ] 料金プラン（`lib/constants.ts` の `PLANS`）の正式金額への更新
- [ ] 特商法・プライバシーポリシー・利用規約ページの追加
- [ ] 独自ドメインでの印刷（PDF）表示確認（Chrome/Safari/Edge）
- [ ] Lighthouse / Core Web Vitals の計測

---

## スクリプト

```bash
npm run dev     # 開発サーバー
npm run build   # 本番ビルド（型チェック込み）
npm run start   # 本番サーバー
```
