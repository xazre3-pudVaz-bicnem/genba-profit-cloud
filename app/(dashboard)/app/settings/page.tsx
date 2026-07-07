"use client";

import { Building2, Database, Download, Landmark, RotateCcw, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageContainer, AppPageHeader } from "@/components/app/app-page-header";
import { Button } from "@/components/shared/button";
import { Card, CardHeader } from "@/components/shared/card";
import { ConfirmDialog } from "@/components/shared/dialog";
import { Input } from "@/components/shared/input";
import { Field } from "@/components/shared/label";
import { Select } from "@/components/shared/select";
import { PageSkeleton } from "@/components/shared/skeleton";
import { toast } from "@/components/shared/toast";
import { APP_NAME } from "@/lib/shared/config";
import {
  exportDataJSON,
  resetDemoData,
  updateCompany,
  useDB,
  useSession,
} from "@/lib/app/data-store";
import { isSupabaseConfigured } from "@/lib/app/supabase";
import type { Company } from "@/lib/app/types";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-neutral-300"}`}
    />
  );
}

export default function SettingsPage() {
  const db = useDB();
  const session = useSession();
  const isDemo = session?.mode !== "supabase";
  const [form, setForm] = useState<Company | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [ocrProvider, setOcrProvider] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (db.hydrated && !form) setForm(db.company);
  }, [db.hydrated, db.company, form]);

  useEffect(() => {
    // OCRプロバイダの状態を確認（キー未設定ならmockが返る）
    fetch("/api/ocr", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((r) => r.json())
      .then((d: { provider?: string }) => setOcrProvider(d.provider ?? "mock"))
      .catch(() => setOcrProvider("mock"));
  }, []);

  if (!db.hydrated || !form) return <PageSkeleton />;

  const set = <K extends keyof Company>(key: K, value: Company[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = () => {
    updateCompany(form);
    toast({ title: "会社設定を保存しました", description: "帳票（見積書・請求書）に反映されます" });
  };

  const onLogoChange = (file: File | undefined | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      set("logoUrl", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const exportData = () => {
    const blob = new Blob([exportDataJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `genba-cloud-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "データをエクスポートしました" });
  };

  return (
    <PageContainer className="max-w-3xl">
      <AppPageHeader
        title="会社設定"
        description="会社情報・振込先は見積書・請求書に反映されます"
        actions={<Button onClick={save}>保存する</Button>}
      />

      <div className="space-y-3">
        <Card>
          <CardHeader title="会社情報" description="帳票の発行元として表示されます" />
          <div className="grid gap-4 px-5 pb-5 pt-2 sm:grid-cols-2">
            <Field label="会社名" className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="例：株式会社〇〇工務店" />
            </Field>
            <Field label="郵便番号">
              <Input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} placeholder="171-0021" />
            </Field>
            <Field label="電話番号">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="03-1234-5678" />
            </Field>
            <Field label="住所" className="sm:col-span-2">
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="メールアドレス">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="インボイス登録番号">
              <Input
                value={form.invoiceRegistrationNumber}
                onChange={(e) => set("invoiceRegistrationNumber", e.target.value)}
                placeholder="T1234567890123"
              />
            </Field>
            <Field label="会社ロゴ（帳票に表示）" className="sm:col-span-2">
              <div className="flex items-center gap-3">
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoUrl} alt="ロゴ" className="h-10 w-auto rounded border border-neutral-200 bg-white object-contain px-2" />
                ) : (
                  <span className="flex h-10 w-24 items-center justify-center rounded border border-dashed border-neutral-200 text-[10px] text-neutral-400">
                    未設定
                  </span>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onLogoChange(e.target.files?.[0])}
                />
                <Button variant="secondary" size="sm" onClick={() => logoInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" />
                  画像を選択
                </Button>
                {form.logoUrl ? (
                  <Button variant="ghost" size="sm" onClick={() => set("logoUrl", null)}>
                    削除
                  </Button>
                ) : null}
              </div>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="振込先口座" description="請求書の「お振込先」欄に表示されます" />
          <div className="grid gap-4 px-5 pb-5 pt-2 sm:grid-cols-2">
            <Field label="銀行名">
              <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} placeholder="三井住友銀行" />
            </Field>
            <Field label="支店名">
              <Input value={form.bankBranch} onChange={(e) => set("bankBranch", e.target.value)} placeholder="池袋支店" />
            </Field>
            <Field label="口座種別">
              <Select value={form.bankAccountType} onChange={(e) => set("bankAccountType", e.target.value)}>
                <option value="普通">普通</option>
                <option value="当座">当座</option>
              </Select>
            </Field>
            <Field label="口座番号">
              <Input value={form.bankAccountNumber} onChange={(e) => set("bankAccountNumber", e.target.value)} placeholder="1234567" />
            </Field>
            <Field label="口座名義（カナ）" className="sm:col-span-2">
              <Input value={form.bankAccountHolder} onChange={(e) => set("bankAccountHolder", e.target.value)} placeholder="カ）〇〇コウムテン" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="接続状態" description="外部サービスとの接続状況" />
          <div className="space-y-3 px-5 pb-5 pt-2">
            <div className="flex items-center justify-between rounded-xl border border-neutral-100 p-3.5">
              <div className="flex items-center gap-3">
                <Database className="h-4 w-4 text-neutral-400" />
                <div>
                  <p className="text-xs font-semibold text-neutral-800">Supabase（データベース・認証）</p>
                  <p className="text-[11px] text-neutral-400">
                    {isSupabaseConfigured()
                      ? "接続済み。認証・ストレージが有効です"
                      : "未設定。現在はデモモード（ブラウザ内保存）で動作しています"}
                  </p>
                </div>
              </div>
              <StatusDot ok={isSupabaseConfigured()} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-neutral-100 p-3.5">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-neutral-400" />
                <div>
                  <p className="text-xs font-semibold text-neutral-800">AI OCR（レシート読み取り）</p>
                  <p className="text-[11px] text-neutral-400">
                    {ocrProvider === null
                      ? "確認中…"
                      : ocrProvider === "mock"
                        ? "APIキー未設定。モック解析で動作中（.envにANTHROPIC_API_KEYを設定で有効化）"
                        : `${ocrProvider === "claude" ? "Claude Vision" : "OpenAI Vision"} で読み取り中`}
                  </p>
                </div>
              </div>
              <StatusDot ok={ocrProvider !== null && ocrProvider !== "mock"} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-neutral-100 p-3.5">
              <div className="flex items-center gap-3">
                <Landmark className="h-4 w-4 text-neutral-400" />
                <div>
                  <p className="text-xs font-semibold text-neutral-800">サービス名</p>
                  <p className="text-[11px] text-neutral-400">
                    現在「{APP_NAME}」。.envの NEXT_PUBLIC_APP_NAME で変更できます
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="データ管理"
            description={isDemo ? "デモデータの初期化・バックアップ" : "ローカルデータのバックアップ"}
          />
          <div className="flex flex-wrap gap-2 px-5 pb-5 pt-2">
            <Button variant="secondary" onClick={exportData}>
              <Download className="h-4 w-4" />
              JSONエクスポート
            </Button>
            {isDemo ? (
              <Button variant="secondary" onClick={() => setResetOpen(true)} className="text-red-600">
                <RotateCcw className="h-4 w-4" />
                デモデータをリセット
              </Button>
            ) : null}
            <Link href="/app/settings/members" className="ml-auto">
              <Button variant="ghost">メンバー管理へ</Button>
            </Link>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="デモデータをリセットしますか？"
        description="現在のすべてのデータが初期のサンプルデータに置き換わります。この操作は取り消せません。"
        confirmLabel="リセットする"
        onConfirm={() => {
          resetDemoData();
          setForm(null);
          toast({ title: "デモデータをリセットしました" });
        }}
      />
    </PageContainer>
  );
}
