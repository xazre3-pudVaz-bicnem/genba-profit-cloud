import { redirect } from "next/navigation";

// 書類作成 > 請求書 は既存の請求作成画面を再利用する
export default function CreateInvoicePage() {
  redirect("/app/invoices/new");
}
