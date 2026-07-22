// ============================================================
// 書類ファイルの受付ルール（デモ・本番共通）
// 対応形式: jpg / jpeg / png / webp / pdf / xlsx / xls / csv
// サイズ上限: 10MB
// ============================================================

export const DOCUMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;

export const DOCUMENT_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "application/vnd.ms-excel,text/csv,.xlsx,.xls,.csv";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]);
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "pdf", "xlsx", "xls", "csv"]);

const SHEET_EXT = new Set(["xlsx", "xls", "csv"]);

export function fileExtension(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

export function isPdfFile(file: Pick<File, "name" | "type">): boolean {
  return file.type === "application/pdf" || fileExtension(file.name) === "pdf";
}

/** Excel / CSV（表データとして読み込むファイル）か */
export function isSheetFile(file: Pick<File, "name" | "type">): boolean {
  return SHEET_EXT.has(fileExtension(file.name)) || file.type === "text/csv";
}

/**
 * ファイルを検証し、問題があれば日本語のエラーメッセージを返す。
 * 問題なければ null。
 */
export function validateDocumentFile(file: File): string | null {
  const okType = ALLOWED_MIME.has(file.type) || ALLOWED_EXT.has(fileExtension(file.name));
  if (!okType) {
    return "対応していないファイル形式です（jpg / jpeg / png / webp / pdf / xlsx / xls / csv）";
  }
  if (file.size > DOCUMENT_MAX_FILE_SIZE) {
    return "ファイルサイズが大きすぎます（10MBまで）";
  }
  return null;
}

/** Storageキーに使える安全なファイル名へ変換する（拡張子は維持） */
export function safeStorageFileName(name: string, mimeType: string): string {
  const extFromMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "text/csv": "csv",
  };
  const ext = fileExtension(name) || extFromMime[mimeType] || "jpg";
  const base = name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40);
  return `${base || "document"}.${ext}`;
}

// ------------------------------------------------------------
// 会社ロゴ（jpg / jpeg / png / webp / svg、上限 5MB）
// ------------------------------------------------------------

export const LOGO_MAX_FILE_SIZE = 5 * 1024 * 1024;

export const LOGO_ACCEPT = "image/jpeg,image/png,image/webp,image/svg+xml";

const LOGO_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
const LOGO_EXT = new Set(["jpg", "jpeg", "png", "webp", "svg"]);

/** ロゴファイルを検証し、問題があれば日本語のエラーメッセージを返す */
export function validateLogoFile(file: File): string | null {
  const okType = LOGO_MIME.has(file.type) || LOGO_EXT.has(fileExtension(file.name));
  if (!okType) {
    return "対応していないファイル形式です（jpg / jpeg / png / webp / svg）";
  }
  if (file.size > LOGO_MAX_FILE_SIZE) {
    return "ファイルサイズが大きすぎます（5MBまで）";
  }
  return null;
}
