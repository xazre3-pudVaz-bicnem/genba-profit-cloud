import { Badge } from "@/components/shared/badge";
import { cn } from "@/lib/shared/utils";

interface StatusMeta {
  label: string;
  badge: string;
  dot: string;
}

/** ステータス定義（constants）からバッジを描画する共通コンポーネント */
export function StatusBadge({ meta, className }: { meta: StatusMeta; className?: string }) {
  return (
    <Badge className={cn(meta.badge, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  );
}
