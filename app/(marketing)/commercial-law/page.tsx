import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";
import { COMPANY_INFO } from "@/lib/legal/company-info";
import { APP_NAME } from "@/lib/shared/config";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description: `${APP_NAME}の特定商取引法に基づく表記です。`,
  alternates: { canonical: "/commercial-law" },
};

// 事業者情報の実体は lib/legal/company-info.ts（正式公開時はそこだけ差し替える）
const ENTRIES: { label: string; value: React.ReactNode }[] = [
  { label: "事業者名", value: COMPANY_INFO.companyName },
  { label: "代表者", value: COMPANY_INFO.representative },
  { label: "サービス名", value: COMPANY_INFO.serviceName },
  { label: "所在地", value: COMPANY_INFO.address },
  { label: "電話番号", value: COMPANY_INFO.phone },
  { label: "メールアドレス", value: COMPANY_INFO.email },
  {
    label: "販売価格",
    value: (
      <>
        <Link href={COMPANY_INFO.pricePagePath} className="text-brand-600 hover:underline">
          料金ページ
        </Link>
        に記載しています（表示価格は税別）
      </>
    ),
  },
  { label: "販売価格以外の必要料金", value: "インターネット接続に必要な通信料等はお客様のご負担となります" },
  { label: "支払方法", value: "クレジットカード決済" },
  { label: "支払時期", value: "各プランの契約時および毎月の更新時" },
  { label: "役務の提供時期", value: "決済完了後、直ちにご利用いただけます" },
  {
    label: "解約について",
    value: "管理画面またはお問い合わせにより、いつでも解約できます。日割り返金は行っておりません",
  },
  {
    label: "動作環境",
    value: "最新版のGoogle Chrome / Safari / Microsoft Edge（スマートフォン・タブレット・PC）",
  },
];

export default function CommercialLawPage() {
  return (
    <LegalPage title="特定商取引法に基づく表記" updatedAt="2026年7月7日">
      <div className="overflow-hidden rounded-2xl border border-neutral-200">
        <table className="w-full text-[13px]">
          <tbody className="divide-y divide-neutral-100">
            {ENTRIES.map((entry) => (
              <tr key={entry.label}>
                <th className="w-40 bg-neutral-50 px-4 py-3.5 text-left align-top text-xs font-semibold text-neutral-700 sm:w-52">
                  {entry.label}
                </th>
                <td className="px-4 py-3.5 leading-6 text-neutral-600">{entry.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-400">
        ※ 本表記は正式公開前のドラフトです。所在地・連絡先等は正式公開時に更新されます。
      </p>
    </LegalPage>
  );
}
