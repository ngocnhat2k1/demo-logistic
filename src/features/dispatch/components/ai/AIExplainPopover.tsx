"use client";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";
import { ConfidenceRing } from "@/shared/ui/ai/ConfidenceRing";
import { ReasonList } from "@/shared/ui/ai/ReasonList";
import { StreamingText } from "@/shared/ui/ai/StreamingText";
import type { PerOrderAi } from "../../domain/aiMockEngine";

/** Vòng tin cậy bấm/hover mở giải thích "Vì sao xe này?". */
export function AIExplainPopover({ ai, onAssign }: { ai: PerOrderAi; onAssign?: () => void }) {
  const s = ai.suggestion;
  const conf = s?.score ?? 0;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="shrink-0" onPointerDown={stop} onClick={stop} aria-label="AI giải thích">
          <ConfidenceRing value={conf} size={36} stroke={4} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72" onPointerDown={stop} onClick={stop}>
        {s ? (
          <>
            <p className="mb-1.5 text-xs font-medium">
              <StreamingText text={`Tôi đề xuất xe ${ai.topPlate ?? ""} cho đơn này vì:`} />
            </p>
            <ReasonList reasons={s.reasons} className="mb-2" />
            {ai.risk.factors.length > 0 && (
              <div className="mb-2 rounded-md bg-warning/10 p-1.5">
                <p className="mb-1 text-[10px] font-semibold text-warning">Yếu tố rủi ro</p>
                <ReasonList reasons={ai.risk.factors} />
              </div>
            )}
            {onAssign && (
              <button
                onClick={onAssign}
                className="w-full rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Phân xe này
              </button>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Chưa có xe liên kết phù hợp cho đơn này.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
