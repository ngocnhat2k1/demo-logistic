import type { Vehicle } from "@/shared/types";

export type MaintenanceState = "ok" | "due_soon" | "overdue";

export interface MaintenanceInfo {
  state: MaintenanceState;
  /** Km driven since the last maintenance reset. */
  kmSinceMaintenance: number;
  /** Remaining km until next maintenance is due (negative when overdue). */
  kmUntilNext: number;
  ratio: number;
  label: string;
}

const DUE_SOON_RATIO = 0.85;

export function getMaintenanceInfo(vehicle: Vehicle): MaintenanceInfo {
  const interval = Math.max(1, vehicle.maintenanceIntervalKm);
  const since = Math.max(0, vehicle.odometerKm - vehicle.lastMaintenanceOdometerKm);
  const ratio = since / interval;
  const kmUntilNext = interval - since;

  let state: MaintenanceState;
  let label: string;
  if (ratio >= 1) {
    state = "overdue";
    label = "Quá hạn bảo trì";
  } else if (ratio >= DUE_SOON_RATIO) {
    state = "due_soon";
    label = "Sắp bảo trì";
  } else {
    state = "ok";
    label = "Ổn";
  }

  return { state, kmSinceMaintenance: since, kmUntilNext, ratio, label };
}

export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return "—";
  return `${Math.round(km).toLocaleString("vi-VN")} km`;
}
