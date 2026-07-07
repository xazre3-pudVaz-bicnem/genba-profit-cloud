import { APP_NAME, CONTACT_EMAIL, OPERATOR_NAME } from "../shared/config";

// ============================================================
// 法務ページ（特商法・規約・プライバシー）で使う事業者情報の単一ソース
//
// 正式公開時はここ（または対応する環境変数）だけを差し替えればよい。
// 「後日記載」「遅滞なく開示」の項目が公開前の仮情報。
// ============================================================

export const COMPANY_INFO = {
  /** 事業者名（NEXT_PUBLIC_OPERATOR_NAME で変更可） */
  companyName: OPERATOR_NAME,
  /** サービス名（NEXT_PUBLIC_APP_NAME で変更可） */
  serviceName: APP_NAME,
  /** 所在地（仮。NEXT_PUBLIC_OPERATOR_ADDRESS で変更可） */
  address: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS || "正式公開前につき後日記載いたします",
  /** 電話番号（仮。NEXT_PUBLIC_OPERATOR_PHONE で変更可） */
  phone: process.env.NEXT_PUBLIC_OPERATOR_PHONE || "請求があった場合に遅滞なく開示いたします",
  /** 問い合わせメール（NEXT_PUBLIC_CONTACT_EMAIL で変更可） */
  email: CONTACT_EMAIL,
  /** 代表者（仮。NEXT_PUBLIC_OPERATOR_REPRESENTATIVE で変更可） */
  representative:
    process.env.NEXT_PUBLIC_OPERATOR_REPRESENTATIVE || "正式公開前につき後日記載いたします",
  /** 販売価格の掲載先 */
  pricePagePath: "/pricing",
} as const;
