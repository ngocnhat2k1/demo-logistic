import { cn } from "@/shared/utils";
import type { RiskResult } from "../../domain/riskScore";

const TONE: Record<RiskResult["level"], string> = {
  "Thấp": "bg-success/15 text-success",
  "Trung bình": "bg-warning/15 text-warning",
  "Cao": "bg-destructive/15 text-destructive",
};

export function RiskBadge({ risk, className }: { risk: RiskResult; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", TONE[risk.level], className)}
    >
      Rủi ro {risk.level} · {risk.score}
    </span>
  );
}
