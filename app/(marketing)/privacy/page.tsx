import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/marketing/legal-page";
import { APP_NAME, CONTACT_EMAIL, OPERATOR_NAME } from "@/lib/shared/config";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: `${APP_NAME}の個人情報の取扱い（プライバシーポリシー）について説明します。`,
  alternates: { canonical: "/privacy" },
};

// 一般的なSaaS向けドラフト（正式公開前に法務確認のうえ差し替え可能な構成）
export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー" updatedAt="2026年7月7日">
      <p>
        {OPERATOR_NAME}（以下「当社」）は、「{APP_NAME}
        」（以下「本サービス」）における個人情報を含む利用者情報の取扱いについて、以下のとおりプライバシーポリシーを定めます。
      </p>

      <LegalSection title="1. 取得する情報">
        <ul className="list-disc space-y-1 pl-5">
          <li>アカウント情報（氏名、メールアドレス、会社名、権限）</li>
          <li>会社情報（住所、電話番号、インボイス登録番号、振込先口座、ロゴ）</li>
          <li>業務データ（案件、売上・原価、見積書・請求書、アップロードされた書類画像）</li>
          <li>利用状況に関する情報（アクセスログ、端末情報、Cookie等）</li>
          <li>決済情報（クレジットカード情報は決済代行事業者が保持し、当社は保持しません）</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. 利用目的">
        <ul className="list-disc space-y-1 pl-5">
          <li>本サービスの提供・維持・保護・改善のため</li>
          <li>本人確認、認証、不正利用の防止のため</li>
          <li>料金の請求・決済のため</li>
          <li>重要なお知らせ・サポート対応・お問い合わせへの回答のため</li>
          <li>法令に基づく対応のため</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. AIによる書類読み取りについて">
        <p>
          アップロードされたレシート・請求書等の画像は、読み取り処理のためにAI事業者（Anthropic等）のAPIへ送信されることがあります。送信は読み取り処理の目的に限定され、当社が契約するAPIにおいて、送信データがAIモデルの学習に利用されない設定・契約形態を利用します。
        </p>
      </LegalSection>

      <LegalSection title="4. 外部サービスの利用">
        <p>本サービスは、以下の外部サービスを利用してデータを保管・処理します。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase（データベース・認証・ファイルストレージ）</li>
          <li>Vercel（アプリケーションホスティング）</li>
          <li>Anthropic / OpenAI（AI読み取り処理）</li>
          <li>Stripe（クレジットカード決済。導入準備中）</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. 第三者提供">
        <p>
          当社は、法令に基づく場合、人の生命・身体・財産の保護に必要な場合等を除き、本人の同意なく個人情報を第三者に提供しません。
        </p>
      </LegalSection>

      <LegalSection title="6. 安全管理措置">
        <p>
          当社は、通信の暗号化（TLS）、会社単位のアクセス制御（Row Level
          Security）、権限管理等により、利用者情報の漏えい・滅失・毀損の防止に努めます。
        </p>
      </LegalSection>

      <LegalSection title="7. Cookie等の利用">
        <p>
          本サービスは、ログイン状態の維持・利用状況の把握のためにCookieおよび類似技術を使用します。ブラウザの設定によりCookieを無効化できますが、その場合サービスの一部が利用できないことがあります。
        </p>
      </LegalSection>

      <LegalSection title="8. 開示・訂正・削除の請求">
        <p>
          ユーザーは、当社が保有する自己の個人情報について、開示・訂正・利用停止・削除を請求できます。下記の問い合わせ先までご連絡ください。本人確認のうえ、法令に従い遅滞なく対応します。
        </p>
      </LegalSection>

      <LegalSection title="9. 改定">
        <p>
          本ポリシーの内容は、法令の変更やサービス内容の変更に応じて改定されることがあります。重要な変更は本サービス上で周知します。
        </p>
      </LegalSection>

      <LegalSection title="10. お問い合わせ窓口">
        <p>
          本ポリシーに関するお問い合わせは、{CONTACT_EMAIL} までご連絡ください。
        </p>
      </LegalSection>
    </LegalPage>
  );
}
