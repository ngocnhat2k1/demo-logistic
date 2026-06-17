"use client";
import { useState } from "react";
import { Layers, ArrowRight } from "lucide-react";
import { formatKg } from "@/shared/utils";
import { RouteClusterDrawer } from "./RouteClusterDrawer";
import type { RouteCluster } from "../../domain/consolidate";

export function AISuggestionRail({ clusters }: { clusters: RouteCluster[] }) {
  const [active, setActive] = useState<RouteCluster | null>(null);
  if (clusters.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
        <Layers className="h-3 w-3" /> Gợi ý gom đơn ({clusters.length})
      </p>
      {clusters.map((c) => (
        <button
          key={c.id}
          onClick={() => setActive(c)}
          className="flex w-full items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-left text-[11px] transition hover:bg-primary/10"
        >
          <span>
            <span className="font-semibold">{c.orders.length} đơn</span> • {formatKg(c.totalKg)}
            {c.vehicle ? ` • ${c.vehicle.plateNumber}` : ""}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-primary">
            tiết kiệm ~{Math.round(c.savedKm)} km <ArrowRight className="h-3 w-3" />
          </span>
        </button>
      ))}
      <RouteClusterDrawer cluster={active} onClose={() => setActive(null)} />
    </div>
  );
}
