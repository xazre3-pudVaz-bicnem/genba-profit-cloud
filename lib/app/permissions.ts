import type { Role } from "./types";

// ============================================================
// 権限によるUI制御（サーバー側はRLSが最終防衛線）
//   owner / admin : 会社設定の編集・メンバー管理・全データ編集
//   staff         : 全データ編集（会社設定は閲覧のみ・メンバー管理不可）
//   viewer        : 閲覧のみ（作成・編集・削除・アップロード不可）
// ============================================================

/** 案件・売上・原価・書類・見積・請求を作成・編集・削除できるか */
export function canEditData(role: Role | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "staff";
}

/** 会社設定の編集・メンバー管理ができるか */
export function canManageCompany(role: Role | null | undefined): boolean {
  return role === "owner" || role === "admin";
}
