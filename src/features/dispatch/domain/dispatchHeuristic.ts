import type { Order, Vehicle } from "@/shared/types";
import { haversine } from "@/shared/utils";

export interface VehicleSuggestion {
  vehicleId: string;
  score: number; // 0..100
  reasons: string[];
}

interface SuggestArgs {
  order: Order;
  vehicles: Vehicle[];
}

export function suggestVehicles({ order, vehicles }: SuggestArgs): VehicleSuggestion[] {
  const candidates = vehicles
    .filter((v) => v.status === "AVAILABLE")
    .filter((v) => v.capacityKg >= order.weightKg)
    .map((v) => {
      const distKm = haversine(v.currentLocation, order.pickup);
      const distScore = Math.max(0, 1 - distKm / 100);

      const usage = order.weightKg / v.capacityKg;
      const capScore = usage >= 0.5 && usage <= 0.95 ? 1 : usage > 0.95 ? 0.4 : 0.55 + usage * 0.5;

      const familiarity = v.routeHistoryCount ?? 0;
      const famScore = Math.min(1, familiarity / 30);

      const score = distScore * 0.55 + capScore * 0.3 + famScore * 0.15;

      const reasons: string[] = [
        `Cách điểm lấy hàng ${distKm.toFixed(1)} km`,
        `Tải trọng phù hợp ${(usage * 100).toFixed(0)}% (${order.weightKg}/${v.capacityKg} kg)`,
        `Tài xế ${v.driverName} - bằng ${v.driverLicenseClass}, đã chạy ${familiarity} chuyến`,
      ];

      return {
        vehicleId: v.id,
        score: Math.round(score * 100),
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return candidates;
}
