// Dự báo ETA mô phỏng TẤT ĐỊNH: haversine × hệ số đường vòng / tốc độ giả định + thời gian phục vụ.
import type { LatLng } from "@/shared/types";
import { haversine } from "@/shared/utils";
import { AVG_SPEED_KMH, STOP_SERVICE_MINUTES } from "../constants";

export interface EtaResult {
  etaIso: string;
  minutes: number;
  distanceKm: number;
  /** ETA trừ hạn giao (phút): >0 = trễ, <=0 = đúng/sớm hẹn. */
  lateMinutes: number;
}

export function predictEta(
  from: LatLng,
  to: LatLng,
  departIso: string,
  weightKg = 0,
  requestedDeliveryAt?: string
): EtaResult {
  const distanceKm = haversine(from, to);
  const roadKm = distanceKm * 1.3; // hệ số đường vòng
  const travelMin = (roadKm / AVG_SPEED_KMH) * 60;
  const loadMin = Math.ceil(weightKg / 1000) * 4;
  const minutes = Math.round(travelMin + STOP_SERVICE_MINUTES + loadMin);
  const depart = new Date(departIso).getTime();
  const etaTime = depart + minutes * 60000;
  const lateMinutes = requestedDeliveryAt
    ? Math.round((etaTime - new Date(requestedDeliveryAt).getTime()) / 60000)
    : 0;
  return { etaIso: new Date(etaTime).toISOString(), minutes, distanceKm, lateMinutes };
}
