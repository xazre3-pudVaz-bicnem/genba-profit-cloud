import { redirect } from "next/navigation";

// 書類作成 > 見積書 は既存の見積作成画面を再利用する
export default function CreateEstimatePage() {
  redirect("/app/estimates/new");
}
