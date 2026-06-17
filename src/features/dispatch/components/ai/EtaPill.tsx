import { Clock } from "lucide-react";
import { cn } from "@/shared/utils";
import { formatClock } from "@/shared/ai/narrative";
import type { EtaResult } from "../../domain/etaPredict";

export function EtaPill({ eta, className }: { eta: EtaResult; className?: string }) {
  const late = eta.lateMinutes > 10;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px]", late ? "text-destructive" : "text-muted-foreground", className)}>
      <Clock className="h-3 w-3" />
      Giao dự kiến {formatClock(eta.etaIso)}
      {late && ` (trễ ${eta.lateMinutes}′)`}
    </span>
  );
}
