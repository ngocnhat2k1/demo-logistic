import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/shared/utils";
import type { AiReason } from "@/shared/ai/types";

/** Liệt kê lý do AI: ✓ xanh cho yếu tố tích cực, ⚠ hổ phách cho yếu tố rủi ro. */
export function ReasonList({
  reasons,
  className,
}: {
  reasons: Array<string | AiReason>;
  className?: string;
}) {
  return (
    <ul className={cn("space-y-1", className)}>
      {reasons.map((r, i) => {
        const item: AiReason = typeof r === "string" ? { label: r, positive: true } : r;
        const isRisk = item.positive === false;
        return (
          <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug">
            {isRisk ? (
              <AlertTriangle className="mt-px h-3 w-3 shrink-0 text-warning" />
            ) : (
              <CheckCircle2 className="mt-px h-3 w-3 shrink-0 text-success" />
            )}
            <span className="text-muted-foreground">
              {item.label}
              {item.delta != null && (
                <span className={cn("ml-1 font-semibold", isRisk ? "text-warning" : "text-success")}>
                  {item.delta > 0 ? `+${item.delta}` : item.delta}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
