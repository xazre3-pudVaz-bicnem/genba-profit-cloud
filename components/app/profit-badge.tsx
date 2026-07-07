import { AlertTriangle, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/shared/badge";
import type { ProjectFinance } from "@/lib/app/calc";
import { pct1 } from "@/lib/shared/format";

/**
 * 利益率バッジ
 * 赤字=赤 / 20%未満=注意 / 30%以上=良好 / 売上未登録=グレー
 */
export function ProfitBadge({ fin }: { fin: ProjectFinance }) {
  if (!fin.hasRevenue && !fin.hasCost) {
    return (
      <Badge className="border-neutral-200 bg-neutral-50 text-neutral-500">
        <Minus className="h-3 w-3" />
        収支未登録
      </Badge>
    );
  }

  if (fin.costOnly) {
    return (
      <Badge className="border-amber-200 bg-amber-50 text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        売上未登録
      </Badge>
    );
  }

  const rate = fin.profitRate ?? 0;

  if (fin.isDeficit) {
    return (
      <Badge className="border-red-200 bg-red-50 text-red-700">
        <TrendingDown className="h-3 w-3" />
        赤字 {pct1(rate)}
      </Badge>
    );
  }

  if (fin.isLowProfit) {
    return (
      <Badge className="border-amber-200 bg-amber-50 text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        注意 {pct1(rate)}
      </Badge>
    );
  }

  if (fin.isGoodProfit) {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
        <TrendingUp className="h-3 w-3" />
        良好 {pct1(rate)}
      </Badge>
    );
  }

  return (
    <Badge className="border-neutral-200 bg-white text-neutral-600">{pct1(rate)}</Badge>
  );
}
