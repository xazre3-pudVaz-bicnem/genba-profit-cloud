import {
  Archive,
  ArrowRight,
  Calculator,
  FileText,
  FolderKanban,
  Handshake,
  JapaneseYen,
  Package,
  Receipt,
  ScanLine,
} from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";

const FEATURES = [
  { icon: FolderKanban, title: "案件管理", body: "複数現場をリスト・ボード・カレンダーで一元管理。ステータスや担当者で瞬時に絞り込み。" },
  { icon: JapaneseYen, title: "売上管理", body: "着手金・完工金を案件ごとに登録。未請求・未入金を自動で追跡します。" },
  { icon: Handshake, title: "発注費管理", body: "協力会社・外注先への発注と支払予定を管理。払い漏れを防ぎます。" },
  { icon: Package, title: "材料費管理", body: "ホームセンターのレシートも写真1枚で登録。案件別の材料費が積み上がります。" },
  { icon: Receipt, title: "経費管理", body: "駐車場代・ガソリン代・処分費まで。現場のこまかい経費も漏らさず記録。" },
  { icon: ScanLine, title: "AIレシート読み取り", body: "金額・日付・取引先・品目をAIが自動抽出。確認して保存するだけ。" },
  { icon: FileText, title: "見積・請求管理", body: "明細を入れるだけでA4のきれいな見積書・請求書PDFを発行できます。" },
  { icon: Calculator, title: "利益自動計算", body: "売上−原価を常時計算。利益率20%未満は警告、赤字は赤色で即表示。" },
  { icon: Archive, title: "書類保管", body: "レシート・請求書・見積書を案件に紐づけてクラウド保管。あとから探せる。" },
];

/** 主な機能（9つ） */
export function FeatureSection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-center text-xs font-bold tracking-widest text-brand-600">FEATURES</p>
          <h2 className="mt-3 text-center text-2xl font-bold leading-snug text-neutral-900 sm:text-3xl">
            現場の収支管理に必要な機能を、全部入りで
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.06}>
              <div className="group h-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 transition-colors group-hover:bg-brand-50">
                  <f.icon className="h-5 w-5 text-neutral-500 transition-colors group-hover:text-brand-600" />
                </span>
                <p className="mt-4 text-sm font-bold text-neutral-900">{f.title}</p>
                <p className="mt-2 text-xs leading-6 text-neutral-500">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-8 text-center">
          <Link
            href="/features"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            すべての機能を見る
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
