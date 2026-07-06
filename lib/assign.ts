import { daysUntil } from "./format";
import type { Confidence, DB, OcrResult, Project } from "./types";

// ============================================================
// 書類の案件自動割り振りロジック
// OCR結果と案件情報・過去の登録履歴から候補をスコアリングする
// ============================================================

export interface AssignCandidate {
  project: Project;
  score: number;
  confidence: Confidence;
  reasons: string[];
}

/** 空白・記号を除去して比較しやすくする */
function normalize(s: string): string {
  return s.replace(/[\s　（）()、。・･【】「」]/g, "").toLowerCase();
}

/** aの中にbが含まれるか（正規化して比較、bは2文字以上） */
function contains(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const na = normalize(a);
  const nb = normalize(b);
  return nb.length >= 2 && na.includes(nb);
}

/** 住所から「市・区・町」レベルの地名を抽出する */
function extractLocality(address: string): string | null {
  const m = address.match(/([^\s　都道府県]{1,6}?[市区町村])/);
  return m ? m[1] : null;
}

export interface SuggestInput {
  ocr: OcrResult | null;
  /** アップロード時に開いていた案件（クエリパラメータ等で渡す） */
  contextProjectId?: string | null;
}

export function suggestProjects(input: SuggestInput, db: DB): AssignCandidate[] {
  const { ocr, contextProjectId } = input;
  const ocrText = [ocr?.rawText, ocr?.addressee, ...(ocr?.items.map((i) => i.name) ?? [])]
    .filter(Boolean)
    .join(" ");

  const candidates: AssignCandidate[] = [];

  for (const project of db.projects) {
    if (project.status === "lost") continue;

    let score = 0;
    const reasons: string[] = [];

    // 1. 同じ取引先を同じ案件に登録した履歴
    if (ocr?.vendorName) {
      const history = db.costs.some(
        (c) =>
          c.projectId === project.id &&
          c.vendorName &&
          (contains(c.vendorName, ocr.vendorName) || contains(ocr.vendorName, c.vendorName))
      );
      if (history) {
        score += 40;
        reasons.push("この取引先を過去にこの案件へ登録");
      }
    }

    // 2. 宛名に顧客名が含まれる
    if (
      ocr?.addressee &&
      (contains(ocr.addressee, project.customerName) ||
        contains(project.customerName, ocr.addressee))
    ) {
      score += 30;
      reasons.push("宛名が顧客名と一致");
    }

    // 3. アップロード時に開いていた案件
    if (contextProjectId && contextProjectId === project.id) {
      score += 25;
      reasons.push("直前に開いていた案件");
    }

    // 4. 書類内テキストに案件住所の地名が含まれる
    const locality = project.siteAddress ? extractLocality(project.siteAddress) : null;
    if (locality && contains(ocrText, locality)) {
      score += 20;
      reasons.push(`現場住所（${locality}）と一致`);
    }

    // 5. 品目・メモに案件名や顧客名が含まれる
    if (contains(ocrText, project.name) || contains(ocrText, project.customerName)) {
      score += 15;
      reasons.push("書類内に案件名・顧客名の記載");
    }

    // 6. 日付が案件期間内（開始7日前〜完了30日後）
    if (ocr?.documentDate && project.startDate) {
      const docOffset = daysUntil(ocr.documentDate);
      const startOffset = daysUntil(project.startDate);
      const endOffset = project.dueDate ? daysUntil(project.dueDate) : null;
      if (
        docOffset !== null &&
        startOffset !== null &&
        docOffset >= startOffset - 7 &&
        (endOffset === null || docOffset <= endOffset + 30)
      ) {
        score += 10;
        reasons.push("日付が工期内");
      }
    }

    // 7. 進行中の案件を優先
    if (project.status === "in_progress" || project.status === "ordered") {
      score += 8;
      reasons.push("進行中の案件");
    } else if (project.status === "completed" || project.status === "invoiced") {
      score += 4;
    }

    candidates.push({
      project,
      score,
      confidence: score >= 60 ? "high" : score >= 30 ? "medium" : "low",
      reasons,
    });
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const CONFIDENCE_BADGES: Record<Confidence, string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};
