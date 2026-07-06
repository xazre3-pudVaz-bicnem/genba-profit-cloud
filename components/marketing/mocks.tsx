"use client";

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Files,
  FolderKanban,
  Home,
  JapaneseYen,
  LayoutDashboard,
  Receipt,
  Settings,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/utils";

// ============================================================
// LP用モックUI（実際の管理画面コンポーネントの雰囲気を再現）
// ============================================================

export function MockBrowser({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_24px_64px_-16px_rgb(16_24_40/0.22)]",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
        <span className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-[9px] text-neutral-400">
          app.genba-cloud.jp
        </span>
      </div>
      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone?: "brand" | "danger" | "warning" | "success";
  icon?: typeof JapaneseYen;
}) {
  return (
    <div className="rounded-xl border border-neutral-200/80 bg-white p-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[8px] font-medium text-neutral-400 sm:text-[9px]">{label}</p>
        {Icon ? (
          <Icon
            className={cn(
              "h-3 w-3",
              tone === "brand"
                ? "text-brand-500"
                : tone === "danger"
                  ? "text-red-400"
                  : tone === "warning"
                    ? "text-amber-400"
                    : tone === "success"
                      ? "text-emerald-400"
                      : "text-neutral-300"
            )}
          />
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1 text-xs font-bold tracking-tight sm:text-sm",
          tone === "danger"
            ? "text-red-600"
            : tone === "warning"
              ? "text-amber-600"
              : tone === "success"
                ? "text-emerald-600"
                : "text-neutral-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}

const CHART_BARS = [
  { r: 42, c: 34 },
  { r: 55, c: 40 },
  { r: 38, c: 33 },
  { r: 70, c: 48 },
  { r: 62, c: 52 },
  { r: 88, c: 58 },
];

function MiniChart() {
  return (
    <div className="rounded-xl border border-neutral-200/80 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold text-neutral-600">月次推移</p>
        <div className="flex gap-2">
          <span className="flex items-center gap-1 text-[8px] text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-[2px] bg-brand-600" />
            売上
          </span>
          <span className="flex items-center gap-1 text-[8px] text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-[2px] bg-[#2a78d6]" />
            原価
          </span>
        </div>
      </div>
      <div className="mt-2 flex h-20 items-end justify-between gap-1.5 border-b border-neutral-100 px-1">
        {CHART_BARS.map((b, i) => (
          <div key={i} className="flex flex-1 items-end justify-center gap-[2px]">
            <span className="w-2.5 rounded-t-[3px] bg-brand-600" style={{ height: `${b.r}%` }} />
            <span className="w-2.5 rounded-t-[3px] bg-[#2a78d6]" style={{ height: `${b.c}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between px-1 text-[7px] text-neutral-300">
        {["2月", "3月", "4月", "5月", "6月", "7月"].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

const MOCK_PROJECTS = [
  { name: "A様邸 キッチンリフォーム", customer: "阿部様", revenue: "¥2,800,000", rate: "38.4%", good: true },
  { name: "Cアパート 外壁補修工事", customer: "大和不動産管理", revenue: "¥3,200,000", rate: "32.3%", good: true },
  { name: "E社 オフィス内装工事", customer: "エムズプランニング", revenue: "¥4,500,000", rate: "-5.1%", good: false },
];

function MiniProjects() {
  return (
    <div className="rounded-xl border border-neutral-200/80 bg-white p-3 shadow-sm">
      <p className="text-[9px] font-bold text-neutral-600">案件別の利益率</p>
      <div className="mt-1.5 divide-y divide-neutral-50">
        {MOCK_PROJECTS.map((p) => (
          <div key={p.name} className="flex items-center gap-2 py-1.5">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", p.good ? "bg-brand-500" : "bg-violet-500")} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] font-semibold text-neutral-800">{p.name}</p>
              <p className="text-[8px] text-neutral-400">{p.customer}</p>
            </div>
            <span className="text-[9px] font-semibold text-neutral-700">{p.revenue}</span>
            <span
              className={cn(
                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold",
                p.good ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}
            >
              {p.good ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
              {p.rate}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SIDEBAR_ICONS = [LayoutDashboard, FolderKanban, JapaneseYen, Receipt, Files, Settings];

/** ダッシュボードのモック画面 */
export function MockDashboard({ className }: { className?: string }) {
  return (
    <MockBrowser className={className}>
      <div className="flex bg-surface">
        {/* サイドバー */}
        <div className="hidden w-11 shrink-0 flex-col items-center gap-1 border-r border-neutral-100 bg-white py-3 sm:flex">
          <BrandMark className="mb-2 h-6 w-6" />
          {SIDEBAR_ICONS.map((Icon, i) => (
            <span
              key={i}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg",
                i === 0 ? "bg-brand-50 text-brand-600" : "text-neutral-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
          ))}
        </div>
        {/* コンテンツ */}
        <div className="flex-1 space-y-2 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-neutral-800">ダッシュボード</p>
            <span className="flex items-center gap-1 rounded-lg bg-brand-600 px-2 py-1 text-[8px] font-bold text-white">
              <Camera className="h-2.5 w-2.5" />
              写真から登録
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <MiniStat label="今月の売上" value="¥5,230,000" tone="brand" icon={JapaneseYen} />
            <MiniStat label="今月の粗利益" value="¥1,284,000" tone="success" icon={TrendingUp} />
            <MiniStat label="未請求" value="¥1,650,000" tone="warning" icon={Files} />
            <MiniStat label="未入金" value="¥1,680,000" tone="danger" icon={Wallet} />
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <MiniChart />
            <MiniProjects />
          </div>
        </div>
      </div>
    </MockBrowser>
  );
}

/** 案件ボードのモック画面 */
export function MockBoard({ className }: { className?: string }) {
  const cols = [
    {
      title: "受注",
      dot: "bg-blue-500",
      cards: [{ name: "G様邸 浴室リフォーム", amount: "¥1,850,000", rate: "見積提出中", tone: "neutral" }],
    },
    {
      title: "施工中",
      dot: "bg-orange-500",
      cards: [
        { name: "Cアパート 外壁補修", amount: "¥3,200,000", rate: "32.3%", tone: "good" },
        { name: "E社 オフィス内装", amount: "¥4,500,000", rate: "-5.1%", tone: "bad" },
      ],
    },
    {
      title: "請求済",
      dot: "bg-violet-500",
      cards: [{ name: "A様邸 キッチン", amount: "¥2,800,000", rate: "38.4%", tone: "good" }],
    },
  ];
  return (
    <MockBrowser className={className}>
      <div className="flex gap-2 bg-surface p-3">
        {cols.map((col) => (
          <div key={col.title} className="flex-1 rounded-xl bg-neutral-100/80 p-2">
            <p className="flex items-center gap-1.5 px-1 pb-1.5 text-[9px] font-bold text-neutral-600">
              <span className={cn("h-1.5 w-1.5 rounded-full", col.dot)} />
              {col.title}
            </p>
            <div className="space-y-1.5">
              {col.cards.map((c) => (
                <div key={c.name} className="rounded-lg border border-neutral-200/70 bg-white p-2 shadow-sm">
                  <p className="truncate text-[9px] font-bold text-neutral-800">{c.name}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-neutral-600">{c.amount}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[7px] font-bold",
                        c.tone === "good"
                          ? "bg-emerald-50 text-emerald-600"
                          : c.tone === "bad"
                            ? "bg-red-50 text-red-600"
                            : "bg-neutral-100 text-neutral-500"
                      )}
                    >
                      {c.tone === "bad" ? "赤字 " : c.tone === "good" ? "良好 " : ""}
                      {c.rate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MockBrowser>
  );
}

/** レシート読み取りフローのモック（スマホ風） */
export function MockOcr({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[300px]", className)}>
      <div className="overflow-hidden rounded-[2rem] border-[6px] border-neutral-900 bg-white shadow-[0_24px_64px_-16px_rgb(16_24_40/0.3)]">
        <div className="bg-white px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-neutral-200" />
          <p className="text-[11px] font-bold text-neutral-900">写真から登録</p>

          {/* レシート画像風 */}
          <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5">
            <div className="flex h-14 w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-neutral-200 bg-white">
              <Receipt className="h-3.5 w-3.5 text-amber-500" />
              <div className="w-6 space-y-0.5">
                <div className="h-0.5 rounded bg-neutral-200" />
                <div className="h-0.5 rounded bg-neutral-200" />
                <div className="h-0.5 w-4 rounded bg-neutral-200" />
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                <Sparkles className="h-2.5 w-2.5" />
                AI読み取り完了
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-neutral-400">取引先</span>
                <span className="font-semibold text-neutral-800">コーナンPRO</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-neutral-400">金額</span>
                <span className="font-bold text-neutral-900">¥46,200</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-neutral-400">日付</span>
                <span className="font-semibold text-neutral-800">2026/07/05</span>
              </div>
            </div>
          </div>

          {/* 案件候補 */}
          <div className="mt-2 rounded-xl border-2 border-brand-500 bg-brand-50/50 p-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold text-neutral-800">Cアパート 外壁補修工事</p>
              <span className="flex items-center gap-0.5 rounded-full bg-brand-100 px-1.5 py-0.5 text-[7px] font-bold text-brand-700">
                <Sparkles className="h-2 w-2" />
                AIおすすめ
              </span>
            </div>
            <p className="mt-0.5 text-[8px] text-neutral-400">同じ取引先を過去にこの案件へ登録・信頼度 高</p>
          </div>
          <div className="mt-1.5 rounded-xl border border-neutral-200 p-2.5 opacity-60">
            <p className="text-[9px] font-semibold text-neutral-600">B店舗 原状回復工事</p>
            <p className="mt-0.5 text-[8px] text-neutral-400">信頼度 中</p>
          </div>

          <button className="mt-3 w-full rounded-lg bg-brand-600 py-2.5 text-[10px] font-bold text-white">
            材料費として登録する
          </button>

          {/* 下部ナビ */}
          <div className="mt-3 flex items-center justify-between border-t border-neutral-100 px-2 pt-2">
            {[Home, FolderKanban, Camera, Files, Settings].map((Icon, i) => (
              <span
                key={i}
                className={cn(
                  "flex items-center justify-center rounded-full",
                  i === 2 ? "-mt-4 h-9 w-9 bg-brand-600 text-white shadow-lg" : "h-6 w-6 text-neutral-300"
                )}
              >
                <Icon className={i === 2 ? "h-4 w-4" : "h-3.5 w-3.5"} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 画面イメージ切り替えタブ */
export function ScreensTabs() {
  const [tab, setTab] = useState<"dashboard" | "board" | "ocr">("dashboard");
  const tabs = [
    { key: "dashboard" as const, label: "ダッシュボード", desc: "売上・利益・未回収を一目で" },
    { key: "board" as const, label: "案件ボード", desc: "現場の進捗をカンバンで管理" },
    { key: "ocr" as const, label: "レシート読み取り", desc: "写真を撮るだけで経費登録" },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-4 py-2 text-xs font-semibold transition-all cursor-pointer sm:text-sm",
              tab === t.key
                ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mb-5 text-center text-xs text-neutral-500">
        {tabs.find((t) => t.key === tab)?.desc}
      </p>
      <div className="mx-auto max-w-3xl">
        {tab === "dashboard" ? <MockDashboard /> : null}
        {tab === "board" ? <MockBoard /> : null}
        {tab === "ocr" ? <MockOcr /> : null}
      </div>
    </div>
  );
}

/** ヒーロー用: 浮遊する通知カード */
export function FloatingCards() {
  return (
    <>
      <div className="absolute -left-4 top-8 hidden animate-[float_5s_ease-in-out_infinite] rounded-xl border border-neutral-200 bg-white p-3 shadow-pop lg:block">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </span>
          <div>
            <p className="text-[10px] font-bold text-neutral-800">レシートを自動登録</p>
            <p className="text-[9px] text-neutral-400">コーナンPRO ¥46,200 → 材料費</p>
          </div>
        </div>
      </div>
      <div className="absolute -right-2 bottom-10 hidden animate-[float_6s_ease-in-out_1s_infinite] rounded-xl border border-neutral-200 bg-white p-3 shadow-pop lg:block">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </span>
          <div>
            <p className="text-[10px] font-bold text-neutral-800">赤字案件を検知</p>
            <p className="text-[9px] text-neutral-400">E社 オフィス内装 利益率 -5.1%</p>
          </div>
        </div>
      </div>
      <style>{`@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }`}</style>
    </>
  );
}
