"use client";

import { useEffect, useRef } from "react";
import { useDataStore } from "@/lib/stores/data";
import { interpolatePolyline } from "@/lib/utils";

const TICK_MS = 3000;

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const ready = useDataStore((s) => s._hasHydrated);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (typeof window === "undefined") return;

    function tick() {
      if (typeof document !== "undefined" && document.hidden) return;
      const state = useDataStore.getState();
      state.vehicles.forEach((v) => {
        if (v.status !== "BUSY" || !v.routePolyline || v.routePolyline.length < 2) return;
        const p = (v.routeProgress ?? 0) + 0.025; // ~ 40 ticks to reach end
        if (p >= 1) {
          // arrived: do not auto-deliver, just stop progressing
          state.setVehicleLocation(v.id, v.routePolyline[v.routePolyline.length - 1].lat, v.routePolyline[v.routePolyline.length - 1].lng, 1);
          return;
        }
        const next = interpolatePolyline(v.routePolyline, p);
        state.setVehicleLocation(v.id, next.lat, next.lng, p);
      });
    }

    intervalRef.current = setInterval(tick, TICK_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [ready]);

  return <>{children}</>;
}
