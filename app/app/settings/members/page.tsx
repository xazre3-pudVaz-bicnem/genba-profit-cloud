"use client";

import { Info, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageSkeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ROLES } from "@/lib/constants";
import { addMember, removeMember, updateMember, useDB } from "@/lib/store";
import type { Member, Role } from "@/lib/types";

export default function MembersPage() {
  const db = useDB();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", role: "staff" as Role });
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  if (!db.hydrated) return <PageSkeleton />;

  const sendInvite = () => {
    if (!invite.name.trim() || !invite.email.trim()) {
      toast({ title: "名前とメールアドレスを入力してください", variant: "error" });
      return;
    }
    addMember({ name: invite.name.trim(), email: invite.email.trim(), role: invite.role });
    toast({ title: "メンバーを追加しました", description: `${invite.name}（${ROLES[invite.role].label}）` });
    setInvite({ name: "", email: "", role: "staff" });
    setInviteOpen(false);
  };

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        title="メンバー管理"
        description="メンバーは自社のデータのみ閲覧・操作できます"
        backHref="/app/settings"
        backLabel="会社設定"
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            メンバーを招待
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
        <p className="text-xs leading-5 text-sky-800">
          本番運用（Supabase接続時）では、Row Level Securityにより会社ごとにデータが完全分離されます。
          スタッフは自社データのみ、閲覧のみロールは参照のみ可能です。
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-card">
        <div className="divide-y divide-neutral-100">
          {db.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                {m.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-neutral-900">
                  {m.name}
                  {m.role === "owner" ? (
                    <Badge className="border-brand-200 bg-brand-50 text-brand-700">オーナー</Badge>
                  ) : null}
                </p>
                <p className="truncate text-[11px] text-neutral-400">{m.email}</p>
              </div>
              {m.role === "owner" ? (
                <span className="text-[11px] text-neutral-400">{ROLES[m.role].description}</span>
              ) : (
                <>
                  <Select
                    value={m.role}
                    onChange={(e) => {
                      updateMember(m.id, { role: e.target.value as Role });
                      toast({ title: `${m.name}の権限を「${ROLES[e.target.value as Role].label}」に変更しました` });
                    }}
                    className="w-32"
                  >
                    {(Object.keys(ROLES) as Role[])
                      .filter((r) => r !== "owner")
                      .map((r) => (
                        <option key={r} value={r}>
                          {ROLES[r].label}
                        </option>
                      ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(m)}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    aria-label="削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-card">
        <p className="flex items-center gap-2 text-xs font-bold text-neutral-700">
          <Users className="h-4 w-4 text-neutral-400" />
          権限について
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(Object.keys(ROLES) as Role[]).map((r) => (
            <div key={r} className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs font-semibold text-neutral-800">{ROLES[r].label}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-neutral-500">{ROLES[r].description}</p>
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="メンバーを招待"
        description="デモモードでは即時追加されます（本番では招待メールを送信）"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={sendInvite}>追加する</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="名前" required>
            <Input
              value={invite.name}
              onChange={(e) => setInvite({ ...invite, name: e.target.value })}
              placeholder="例：田中 一郎"
            />
          </Field>
          <Field label="メールアドレス" required>
            <Input
              type="email"
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
              placeholder="tanaka@example.com"
            />
          </Field>
          <Field label="権限">
            <Select
              value={invite.role}
              onChange={(e) => setInvite({ ...invite, role: e.target.value as Role })}
            >
              {(Object.keys(ROLES) as Role[])
                .filter((r) => r !== "owner")
                .map((r) => (
                  <option key={r} value={r}>
                    {ROLES[r].label} — {ROLES[r].description}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`${deleteTarget?.name ?? ""}を削除しますか？`}
        description="このメンバーが担当している案件は「担当者未設定」になります。"
        onConfirm={() => {
          if (deleteTarget) {
            removeMember(deleteTarget.id);
            toast({ title: "メンバーを削除しました" });
          }
        }}
      />
    </PageContainer>
  );
}
