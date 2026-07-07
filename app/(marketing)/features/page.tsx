import type { Metadata } from "next";
import {
  Archive,
  ArrowRight,
  Calculator,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderKanban,
  JapaneseYen,
  Receipt,
  ScanLine,
  Smartphone,
  SquareKanban,
  Users,
} from "lucide-react";
import Link from "next/link";
import { MockBoard, MockDashboard, MockOcr } from "@/components/marketing/mocks";
import { Reveal } from "@/components/marketing/reveal";
import { Button } from "@/components/shared/button";
import { APP_NAME } from "@/lib/shared/config";
import { appAuthUrl, appDemoUrl } from "@/lib/shared/urls";

export const metadata: Metadata = {
  title: "機能一覧",
  description: `${APP_NAME}の機能一覧。案件管理・AIレシート読み取り・利益自動計算・見積請求PDF・案件ボード・カレンダーなど、現場の収支管理に必要な機能をすべて搭載。`,
  alternates: { canonical: "/features" },
};

const SECTIONS = [
  {
    id: "projects",
    icon: FolderKanban,
    title: "案件管理",
    lead: "複数現場を、ひとつの画面で",
    body: "案件ごとに顧客・現場住所・工期・担当者・ステータスを管理。リスト表示ではすべての案件の売上・原価・利益率・未請求・未入金を横断して比較でき、儲かっていない現場がすぐに分かります。",
    points: ["ステータス・担当者・期間での絞り込み", "利益率が低い案件のワンタップ抽出", "検索は案件名・顧客名・住所・メモまで対応"],
    mock: "dashboard",
  },
  {
    id: "ocr",
    icon: ScanLine,
    title: "AIレシート読み取り",
    lead: "レシート登録は、撮って確認するだけ",
    body: "レシート・領収書・請求書・見積書をスマホで撮影すると、AIが金額・日付・取引先・品目を自動抽出。過去の登録履歴や宛名から案件を推定し、おすすめ順に候補を表示します。読み取り結果は必ず確認画面でチェックしてから保存する半自動方式なので安心です。",
    points: ["金額・日付・取引先・インボイス登録番号を自動抽出", "案件の自動推定（信頼度つき）", "AIが使えない環境でも手入力でそのまま登録可能"],
    mock: "ocr",
  },
  {
    id: "profit",
    icon: Calculator,
    title: "利益の自動計算",
    lead: "粗利と利益率が、常に最新",
    body: "売上合計から発注費・材料費・経費を差し引いた粗利益と利益率を案件ごとにリアルタイム計算。利益率20%未満は注意表示、赤字はダッシュボードで即座に警告します。未請求額・未入金額・未払い額も自動集計。",
    points: ["赤字案件・低利益率案件の自動警告", "未請求・未入金・未払いの自動追跡", "月次の売上・原価・粗利の推移グラフ"],
    mock: "dashboard",
  },
  {
    id: "board",
    icon: SquareKanban,
    title: "案件ボード・カレンダー",
    lead: "現場の動きを、見える形で",
    body: "見積中から入金済まで、案件をステータスごとに並べたボードで進捗を管理。ドラッグ&ドロップでステータスを更新できます。カレンダーでは工期・請求予定・入金予定を月表示し、期日超過は赤色で表示します。",
    points: ["ドラッグ&ドロップでステータス変更", "期日超過の自動検知", "完了予定日が近い案件のリマインド"],
    mock: "board",
  },
  {
    id: "invoice",
    icon: FileText,
    title: "見積書・請求書・領収書",
    lead: "きれいな帳票を、その場で発行",
    body: "明細行を入力するだけで、日本の商習慣に沿ったA4縦の見積書・請求書を作成。会社ロゴ・インボイス登録番号・振込先を設定でき、ブラウザからそのままPDF保存・印刷できます。入金済みの請求書からは領収書も発行可能。",
    points: ["A4縦・日本標準の帳票レイアウト", "請求書から売上への自動反映", "支払期限超過の自動アラート"],
    mock: "dashboard",
  },
] as const;

const OTHERS = [
  { icon: JapaneseYen, title: "売上管理", body: "着手金・完工金の分割管理。請求予定・入金予定つき" },
  { icon: Receipt, title: "経費カテゴリ", body: "駐車場・ガソリン・高速・産廃処分など現場仕様の9分類" },
  { icon: Archive, title: "書類保管", body: "案件別・種別・期間で検索できるクラウド書庫" },
  { icon: CalendarDays, title: "カレンダー", body: "工期と入出金の予定をひとつの月表示に" },
  { icon: Users, title: "メンバー権限", body: "オーナー・管理者・スタッフ・閲覧のみの4段階" },
  { icon: Smartphone, title: "スマホ最適化", body: "下部ナビと大きなボタンで現場でも迷わない" },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="border-b border-neutral-100 bg-surface py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-xs font-bold tracking-widest text-brand-600">FEATURES</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              現場の収支管理に、これひとつ
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-neutral-500">
              施工管理アプリのような複雑さはありません。
              「案件ごとの利益を見える化する」ことに絞った、現場のためのミニ業務アプリです。
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl space-y-20 px-4 sm:px-6">
          {SECTIONS.map((section, i) => (
            <Reveal key={section.id}>
              <div
                className={`grid items-center gap-10 lg:grid-cols-2 ${
                  i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                    <section.icon className="h-5 w-5 text-brand-600" />
                  </span>
                  <p className="mt-4 text-xs font-bold text-brand-600">{section.title}</p>
                  <h2 className="mt-2 text-2xl font-bold leading-snug text-neutral-900">
                    {section.lead}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-neutral-600">{section.body}</p>
                  <ul className="mt-5 space-y-2.5">
                    {section.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-neutral-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  {section.mock === "dashboard" ? <MockDashboard /> : null}
                  {section.mock === "board" ? <MockBoard /> : null}
                  {section.mock === "ocr" ? <MockOcr /> : null}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-neutral-100 bg-surface py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center text-xl font-bold text-neutral-900 sm:text-2xl">
              その他の機能
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OTHERS.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.05}>
                <div className="h-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
                    <f.icon className="h-[18px] w-[18px] text-neutral-500" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-neutral-900">{f.title}</p>
                  <p className="mt-1.5 text-xs leading-5 text-neutral-500">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <Link href={appDemoUrl()}>
              <Button size="lg">デモで操作感を確認する</Button>
            </Link>
            <Link href={appAuthUrl("/signup")}>
              <Button size="lg" variant="secondary">
                無料で試す
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
