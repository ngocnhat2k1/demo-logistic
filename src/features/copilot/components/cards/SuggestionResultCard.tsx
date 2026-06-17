"use client";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { cn, formatKg } from "@/shared/utils";
import { ReasonList } from "@/shared/ui/ai/ReasonList";
import { AIBadge } from "@/shared/ui/ai/AIBadge";
import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import type { ResultCard, SuggestionItem } from "../../types";

type C = Extract<ResultCard, { kind: "suggestion" }>;

export function SuggestionResultCard({ card }: { card: C }) {
  const submitCarrier = useDataStore((s) => s.submitOrderCarrier);
  const assign = useDataStore((s) => s.assignOrderToVehicle);
  const user = useAuthStore((s) => s.currentUser);

  function handleAssign(it: SuggestionItem) {
    if (!user) {
      toast.error("Chưa đăng nhập");
      return;
    }
    const r = submitCarrier(card.orderId, it.carrierId, user.id);
    if (!r.ok) {
      toast.error(r.reason || "Không phân được xe");
      return;
    }
    if (r.needsReview) {
      toast.success(`Đã gửi ${card.orderCode} lên giám sát duyệt (NCC dự phòng)`);
      return;
    }
    const a = assign(card.orderId, it.vehicleId, user.id);
    if (a) toast.success(`AI đã phân ${it.plate} cho ${card.orderCode}`);
    else toast.error("Không phân được xe — kiểm tra trạng thái đơn");
  }

  return (
    <div className="space-y-1.5 rounded-lg border bg-card p-2">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Gợi ý xe cho {card.orderCode} • {formatKg(card.weightKg)}
      </p>
      {card.items.map((it, idx) => (
        <div key={it.vehicleId} className={cn("rounded-md border p-2", idx === 0 && "border-primary/50 bg-primary/5")}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-mono text-xs font-semibold">
              <Truck className="h-3.5 w-3.5 text-primary" /> {it.plate}
            </span>
            {idx === 0 ? <AIBadge label="AI đề xuất" /> : <span className="text-[10px] text-muted-foreground">{it.driverName}</span>}
          </div>
          <div className="mb-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${it.score}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right text-[10px] font-bold tabular-nums text-primary">{it.score}/100</span>
          </div>
          <ReasonList reasons={it.reasons} className="mb-1.5" />
          <button
            onClick={() => handleAssign(it)}
            className="w-full rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Phân xe này
          </button>
        </div>
      ))}
    </div>
  );
}
