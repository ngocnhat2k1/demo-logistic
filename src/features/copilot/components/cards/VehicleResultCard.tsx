"use client";
import { Truck } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { formatKg, cn } from "@/shared/utils";
import { useCopilotStore } from "../../stores/copilot";
import type { ResultCard } from "../../types";

type C = Extract<ResultCard, { kind: "vehicles" }>;

export function VehicleResultCard({ card }: { card: C }) {
  const selected = useCopilotStore((s) => s.selectedVehicleId);
  const setSel = useCopilotStore((s) => s.setSelectedVehicle);
  return (
    <div className="rounded-lg border bg-card p-2 text-xs">
      {card.title && (
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{card.title}</p>
      )}
      <div className="space-y-0.5">
        {card.items.map((v) => (
          <button
            key={v.id}
            onClick={() => setSel(v.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-muted",
              selected === v.id && "bg-primary/5 ring-1 ring-primary"
            )}
          >
            <Truck className="h-3.5 w-3.5 shrink-0 text-success" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold">{v.plate}</span>
                <Badge variant={v.statusTone} className="px-1.5 py-0 text-[9px]">
                  {v.statusLabel}
                </Badge>
              </div>
              <p className="truncate text-muted-foreground">{v.driverName}</p>
            </div>
            <div className="shrink-0 text-right text-[10px] text-muted-foreground">
              {v.distanceKm != null && <p>{v.distanceKm.toFixed(1)} km</p>}
              {v.freeKg != null && <p>trống {formatKg(v.freeKg)}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
