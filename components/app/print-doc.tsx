/* eslint-disable @next/next/no-img-element */
import { longDate, yen } from "@/lib/shared/format";
import type { Company, LineItem } from "@/lib/app/types";

// ============================================================
// A4帳票（見積書・請求書・領収書）
// 画面ではプレビュー、印刷時は .print-area のみが出力される
// ============================================================

export interface PrintDocData {
  number: string;
  customerName: string;
  title: string;
  items: LineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  /** 発行日・請求日・領収日 */
  date: string | null;
  /** 見積: 有効期限 */
  validUntil?: string | null;
  /** 請求: 支払期限 */
  dueDate?: string | null;
  memo?: string;
}

interface PrintDocProps {
  kind: "estimate" | "invoice" | "receipt";
  data: PrintDocData;
  company: Company;
}

const KIND_META = {
  estimate: {
    title: "御 見 積 書",
    amountLabel: "御見積金額",
    lead: "下記の通り、お見積り申し上げます。",
  },
  invoice: {
    title: "御 請 求 書",
    amountLabel: "御請求金額",
    lead: "下記の通り、ご請求申し上げます。",
  },
  receipt: {
    title: "領 収 書",
    amountLabel: "領収金額",
    lead: "下記の通り、領収いたしました。",
  },
} as const;

export function PrintDoc({ kind, data, company }: PrintDocProps) {
  const meta = KIND_META[kind];
  const emptyRows = Math.max(0, 8 - data.items.length);

  return (
    <div className="print-area mx-auto w-full max-w-[820px] rounded-2xl border border-neutral-200 bg-white p-7 shadow-card sm:p-12">
      {/* タイトル */}
      <h1 className="text-center text-2xl font-bold tracking-[0.35em] text-neutral-900">
        {meta.title}
      </h1>
      <div className="mx-auto mt-2 h-0.5 w-28 bg-neutral-900" />

      {/* 番号・日付 */}
      <div className="mt-6 flex justify-end">
        <table className="text-[11px] text-neutral-600">
          <tbody>
            <tr>
              <td className="pr-3 text-right">No.</td>
              <td className="tnum">{data.number}</td>
            </tr>
            <tr>
              <td className="pr-3 text-right">発行日</td>
              <td className="tnum">{data.date ? longDate(data.date) : "　"}</td>
            </tr>
            {kind === "estimate" && data.validUntil ? (
              <tr>
                <td className="pr-3 text-right">有効期限</td>
                <td className="tnum">{longDate(data.validUntil)}</td>
              </tr>
            ) : null}
            {kind === "invoice" && data.dueDate ? (
              <tr>
                <td className="pr-3 text-right">お支払期限</td>
                <td className="tnum">{longDate(data.dueDate)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* 宛名 + 自社情報 */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-[240px]">
          <p className="border-b-2 border-neutral-800 pb-1.5 text-lg font-bold text-neutral-900">
            {data.customerName || "　"} <span className="text-sm font-medium">御中</span>
          </p>
          <p className="mt-3 text-xs text-neutral-600">{meta.lead}</p>
          <div className="mt-4">
            <p className="text-[10px] text-neutral-400">件名</p>
            <p className="border-b border-neutral-300 pb-1 text-sm font-semibold text-neutral-800">
              {data.title || "　"}
            </p>
          </div>
        </div>

        <div className="relative text-[11px] leading-5 text-neutral-700">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt="" className="mb-1.5 h-9 w-auto object-contain" />
          ) : null}
          <p className="text-sm font-bold text-neutral-900">{company.name || "会社名未設定"}</p>
          {company.postalCode ? <p>〒{company.postalCode}</p> : null}
          {company.address ? <p>{company.address}</p> : null}
          {company.phone ? <p>TEL: {company.phone}</p> : null}
          {company.email ? <p>{company.email}</p> : null}
          {company.invoiceRegistrationNumber ? (
            <p className="tnum">登録番号: {company.invoiceRegistrationNumber}</p>
          ) : null}
          {/* 社印スペース */}
          <span className="absolute -right-2 top-8 flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-red-300 text-[9px] text-red-300">
            社印
          </span>
        </div>
      </div>

      {/* 金額ボックス */}
      <div className="mt-6 flex items-stretch border-2 border-neutral-800">
        <div className="flex items-center bg-neutral-800 px-4 py-2.5 text-sm font-bold text-white">
          {meta.amountLabel}
        </div>
        <div className="flex flex-1 items-center justify-end px-5">
          <span className="tnum text-2xl font-bold tracking-tight text-neutral-900">
            {yen(data.total)}
            <span className="ml-1 text-xs font-medium text-neutral-500">-（税込）</span>
          </span>
        </div>
      </div>

      {kind === "receipt" ? (
        <p className="mt-3 border-b border-neutral-300 pb-1 text-xs text-neutral-700">
          但し {data.title || "工事代金"} として
        </p>
      ) : null}

      {/* 明細 */}
      {kind !== "receipt" ? (
        <table className="mt-6 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-neutral-100 text-[11px] text-neutral-600">
              <th className="border border-neutral-300 px-2 py-2 font-semibold w-9">No.</th>
              <th className="border border-neutral-300 px-3 py-2 text-left font-semibold">品目</th>
              <th className="border border-neutral-300 px-2 py-2 font-semibold w-14">数量</th>
              <th className="border border-neutral-300 px-2 py-2 font-semibold w-12">単位</th>
              <th className="border border-neutral-300 px-3 py-2 font-semibold w-24">単価</th>
              <th className="border border-neutral-300 px-3 py-2 font-semibold w-28">金額</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={item.id}>
                <td className="tnum border border-neutral-300 px-2 py-2 text-center text-neutral-500">
                  {i + 1}
                </td>
                <td className="border border-neutral-300 px-3 py-2 text-neutral-800">{item.name}</td>
                <td className="tnum border border-neutral-300 px-2 py-2 text-right text-neutral-800">
                  {item.quantity}
                </td>
                <td className="border border-neutral-300 px-2 py-2 text-center text-neutral-800">
                  {item.unit}
                </td>
                <td className="tnum border border-neutral-300 px-3 py-2 text-right text-neutral-800">
                  {yen(item.unitPrice)}
                </td>
                <td className="tnum border border-neutral-300 px-3 py-2 text-right font-medium text-neutral-900">
                  {yen(item.amount)}
                </td>
              </tr>
            ))}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-neutral-300 px-2 py-2 text-center">&nbsp;</td>
                <td className="border border-neutral-300 px-3 py-2" />
                <td className="border border-neutral-300 px-2 py-2" />
                <td className="border border-neutral-300 px-2 py-2" />
                <td className="border border-neutral-300 px-3 py-2" />
                <td className="border border-neutral-300 px-3 py-2" />
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="border-0" />
              <td className="border border-neutral-300 bg-neutral-50 px-3 py-2 text-[11px] font-semibold text-neutral-600">
                小計（税別）
              </td>
              <td className="tnum border border-neutral-300 px-3 py-2 text-right font-medium">
                {yen(data.subtotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border-0" />
              <td className="border border-neutral-300 bg-neutral-50 px-3 py-2 text-[11px] font-semibold text-neutral-600">
                消費税（10%）
              </td>
              <td className="tnum border border-neutral-300 px-3 py-2 text-right font-medium">
                {yen(data.taxAmount)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border-0" />
              <td className="border-2 border-neutral-800 bg-neutral-800 px-3 py-2 text-[11px] font-bold text-white">
                合計（税込）
              </td>
              <td className="tnum border-2 border-neutral-800 px-3 py-2 text-right text-sm font-bold">
                {yen(data.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <div className="mt-8 flex justify-end">
          <span className="flex h-20 w-16 items-center justify-center border border-dashed border-neutral-300 text-center text-[9px] leading-4 text-neutral-400">
            収入
            <br />
            印紙
          </span>
        </div>
      )}

      {/* 振込先（請求書のみ） */}
      {kind === "invoice" && company.bankName ? (
        <div className="mt-5 rounded-lg border border-neutral-300 p-3.5">
          <p className="text-[10px] font-bold text-neutral-500">お振込先</p>
          <p className="mt-1 text-xs font-medium text-neutral-800">
            {company.bankName} {company.bankBranch}（{company.bankAccountType}）
            <span className="tnum ml-1">{company.bankAccountNumber}</span>
          </p>
          <p className="text-xs text-neutral-600">{company.bankAccountHolder}</p>
          <p className="mt-1 text-[10px] text-neutral-400">
            誠に恐れ入りますが、振込手数料は貴社にてご負担願います。
          </p>
        </div>
      ) : null}

      {/* 備考 */}
      {data.memo ? (
        <div className="mt-4">
          <p className="text-[10px] font-bold text-neutral-500">備考</p>
          <p className="mt-1 whitespace-pre-wrap rounded-lg border border-neutral-200 p-3 text-xs leading-5 text-neutral-700">
            {data.memo}
          </p>
        </div>
      ) : null}
    </div>
  );
}
