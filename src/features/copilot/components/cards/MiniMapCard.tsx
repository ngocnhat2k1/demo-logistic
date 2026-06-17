"use client";
import { MapCanvas } from "@/shared/map";
import { useCopilotStore } from "../../stores/copilot";
import type { ResultCard } from "../../types";

type C = Extract<ResultCard, { kind: "map" }>;

export function MiniMapCard({ card }: { card: C }) {
  const selected = useCopilotStore((s) => s.selectedVehicleId);
  const setSel = useCopilotStore((s) => s.setSelectedVehicle);
  return (
    <div className="overflow-hidden rounded-lg border">
      <MapCanvas
        markers={card.markers}
        polylines={card.polylines}
        center={card.center}
        cluster
        className="h-56 w-full"
        selectedId={selected}
        onMarkerClick={setSel}
        fitKey={`copilot-${card.markers.length}`}
      />
    </div>
  );
}
