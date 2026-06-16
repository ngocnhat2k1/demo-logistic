"use client";

import { useEffect, useRef } from "react";
import { useDataStore } from "@/shared/stores/data";
import { interpolatePolyline } from "@/shared/utils";

const TICK_MS = 3000;
/** Trễ giả lập "đối soát" chuyển khoản trước khi tự xác nhận đã nhận tiền. */
const COD_VERIFY_DELAY_MS = 4000;

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const ready = useDataStore((s) => s._hasHydrated);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (typeof window === "undefined") return;

    function tick() {
      if (typeof document !== "undefined" && document.hidden) return;
      const state = useDataStore.getState();
      state.autoResetMonthlyIfDue();
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

      // Mock đối soát thanh toán: khách đã báo chuyển khoản (VERIFYING) đủ lâu → tự xác nhận đã nhận tiền.
      const now = Date.now();
      state.orders.forEach((o) => {
        if (
          o.status === "PENDING_PAYMENT" &&
          o.codStatus === "VERIFYING" &&
          o.codTransferAt &&
          now - new Date(o.codTransferAt).getTime() >= COD_VERIFY_DELAY_MS
        ) {
          state.confirmCodPayment(o.id, "system");
        }
      });
    }

    intervalRef.current = setInterval(tick, TICK_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [ready]);

  return <>{children}</>;
}
