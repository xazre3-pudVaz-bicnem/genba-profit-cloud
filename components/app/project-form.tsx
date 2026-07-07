"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/shared/button";
import { Dialog } from "@/components/shared/dialog";
import { Input } from "@/components/shared/input";
import { Field } from "@/components/shared/label";
import { Select } from "@/components/shared/select";
import { Textarea } from "@/components/shared/textarea";
import { toast } from "@/components/shared/toast";
import { PROJECT_COLORS, PROJECT_STATUSES, PROJECT_STATUS_ORDER } from "@/lib/app/constants";
import { addProject, updateProject, useDB } from "@/lib/app/store";
import type { Project, ProjectStatus } from "@/lib/app/types";
import { cn } from "@/lib/shared/utils";

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
  onSaved?: (project: Project) => void;
}

interface FormState {
  name: string;
  customerName: string;
  siteAddress: string;
  managerId: string;
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
  completedDate: string;
  tags: string;
  color: string;
  memo: string;
}

function initialState(project?: Project | null): FormState {
  return {
    name: project?.name ?? "",
    customerName: project?.customerName ?? "",
    siteAddress: project?.siteAddress ?? "",
    managerId: project?.managerId ?? "",
    status: project?.status ?? "estimate",
    startDate: project?.startDate ?? "",
    dueDate: project?.dueDate ?? "",
    completedDate: project?.completedDate ?? "",
    tags: project?.tags.join("、") ?? "",
    color: project?.color ?? PROJECT_COLORS[0],
    memo: project?.memo ?? "",
  };
}

export function ProjectForm({ open, onClose, project, onSaved }: ProjectFormProps) {
  const db = useDB();
  const [form, setForm] = useState<FormState>(() => initialState(project));

  useEffect(() => {
    if (open) setForm(initialState(project));
  }, [open, project]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = () => {
    if (!form.name.trim()) {
      toast({ title: "案件名を入力してください", variant: "error" });
      return;
    }
    const input = {
      name: form.name.trim(),
      customerName: form.customerName.trim(),
      siteAddress: form.siteAddress.trim(),
      managerId: form.managerId || null,
      status: form.status,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
      completedDate: form.completedDate || null,
      tags: form.tags
        .split(/[、,]/)
        .map((t) => t.trim())
        .filter(Boolean),
      color: form.color,
      memo: form.memo,
    };

    if (project) {
      updateProject(project.id, input);
      toast({ title: "案件を更新しました" });
      onSaved?.({ ...project, ...input, updatedAt: new Date().toISOString() });
    } else {
      const created = addProject(input);
      toast({ title: "案件を作成しました", description: created.name });
      onSaved?.(created);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={project ? "案件を編集" : "新しい案件"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={save}>{project ? "保存する" : "作成する"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="案件名" required className="sm:col-span-2">
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="例：A様邸 キッチンリフォーム"
          />
        </Field>
        <Field label="顧客名">
          <Input
            value={form.customerName}
            onChange={(e) => set("customerName", e.target.value)}
            placeholder="例：山田 太郎 / 株式会社〇〇"
          />
        </Field>
        <Field label="担当者">
          <Select value={form.managerId} onChange={(e) => set("managerId", e.target.value)}>
            <option value="">未設定</option>
            {db.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="現場住所" className="sm:col-span-2">
          <Input
            value={form.siteAddress}
            onChange={(e) => set("siteAddress", e.target.value)}
            placeholder="例：東京都練馬区〇〇1-2-3"
          />
        </Field>
        <Field label="ステータス">
          <Select
            value={form.status}
            onChange={(e) => set("status", e.target.value as ProjectStatus)}
          >
            {PROJECT_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUSES[s].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="タグ" hint="「、」区切りで複数入力できます">
          <Input
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="例：リフォーム、戸建"
          />
        </Field>
        <Field label="開始予定日">
          <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="完了予定日">
          <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </Field>
        <Field label="実完了日">
          <Input
            type="date"
            value={form.completedDate}
            onChange={(e) => set("completedDate", e.target.value)}
          />
        </Field>
        <Field label="案件カラー">
          <div className="flex h-10 items-center gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("color", c)}
                className={cn(
                  "h-6 w-6 rounded-full transition-transform cursor-pointer",
                  form.color === c && "ring-2 ring-neutral-900 ring-offset-2 scale-110"
                )}
                style={{ background: c }}
                aria-label={`カラー ${c}`}
              />
            ))}
          </div>
        </Field>
        <Field label="メモ" className="sm:col-span-2">
          <Textarea
            rows={3}
            value={form.memo}
            onChange={(e) => set("memo", e.target.value)}
            placeholder="工事内容・注意点などを記録できます"
          />
        </Field>
      </div>
    </Dialog>
  );
}
