import type { Driver, Order, Vehicle } from "@/types";
import { haversine } from "@/lib/utils";

export interface VehicleSuggestion {
  vehicleId: string;
  driverId: string;
  score: number; // 0..100
  reasons: string[];
}

interface SuggestArgs {
  order: Order;
  vehicles: Vehicle[];
  drivers: Driver[];
}

export function suggestVehicles({ order, vehicles, drivers }: SuggestArgs): VehicleSuggestion[] {
  const candidates = vehicles
    .filter((v) => v.status === "AVAILABLE")
    .filter((v) => v.capacityKg >= order.weightKg)
    .map((v) => {
      const driver = drivers.find((d) => d.id === v.currentDriverId);
      const distKm = haversine(v.currentLocation, order.pickup);
      const distScore = Math.max(0, 1 - distKm / 100); // 0..1, decays after 100km

      const usage = order.weightKg / v.capacityKg;
      // Optimal usage 0.5..0.95 → 1.0; very low or overloaded → lower
      const capScore = usage >= 0.5 && usage <= 0.95 ? 1 : usage > 0.95 ? 0.4 : 0.55 + usage * 0.5;

      const familiarity = driver?.routeHistoryCount ?? 0;
      const famScore = Math.min(1, familiarity / 30);

      const score = distScore * 0.55 + capScore * 0.3 + famScore * 0.15;

      const reasons: string[] = [
        `Cách điểm lấy hàng ${distKm.toFixed(1)} km`,
        `Tải trọng phù hợp ${(usage * 100).toFixed(0)}% (${order.weightKg}/${v.capacityKg} kg)`,
        driver
          ? `Tài xế ${driver.fullName} - bằng ${driver.licenseClass}, đã chạy ${familiarity} chuyến`
          : "Chưa có tài xế gắn xe",
      ];

      return {
        vehicleId: v.id,
        driverId: v.currentDriverId ?? "",
        score: Math.round(score * 100),
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return candidates;
}
