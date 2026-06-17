"use client";
import { RiskBadge } from "./RiskBadge";
import { EtaPill } from "./EtaPill";
import { AIExplainPopover } from "./AIExplainPopover";
import type { PerOrderAi } from "../../domain/aiMockEngine";

/** Lớp phủ AI gắn lên card đơn khi bật Chế độ AI. */
export function AIOrderCardOverlay({ ai, onAssign }: { ai: PerOrderAi; onAssign?: () => void }) {
  return (
    <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md bg-primary/5 px-2 py-1">
      <div className="flex flex-col gap-0.5">
        <RiskBadge risk={ai.risk} />
        <EtaPill eta={ai.eta} />
      </div>
      <AIExplainPopover ai={ai} onAssign={onAssign} />
    </div>
  );
}
