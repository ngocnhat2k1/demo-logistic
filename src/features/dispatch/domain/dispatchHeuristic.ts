import type { Order, Vehicle, Warehouse } from "@/shared/types";
import { haversine } from "@/shared/utils";

export interface VehicleSuggestion {
  vehicleId: string;
  score: number; // 0..100
  reasons: string[];
  /** Điểm đóng góp đã nhân trọng số (0..100) — dùng cho UI "Vì sao xe này?". */
  breakdown?: { dist: number; warehouse: number; capacity: number; familiarity: number };
}

interface SuggestArgs {
  order: Order;
  vehicles: Vehicle[];
  /** Kho gốc của đơn (tuỳ chọn). Khi có → thêm điểm khoảng-cách-từ-kho (soft). */
  warehouse?: Warehouse | null;
}

export function suggestVehicles({ order, vehicles, warehouse }: SuggestArgs): VehicleSuggestion[] {
  const candidates = vehicles
    .filter((v) => v.status === "AVAILABLE")
    .filter((v) => v.capacityKg >= order.weightKg)
    .map((v) => {
      const distKm = haversine(v.currentLocation, order.pickup);
      const distScore = Math.max(0, 1 - distKm / 100);

      // Thành phần khoảng-cách-từ-kho (soft). Vắng kho → bằng distScore (không đổi hành vi).
      const whDistKm = warehouse ? haversine(v.currentLocation, warehouse.location) : null;
      const whScore = whDistKm == null ? distScore : Math.max(0, 1 - whDistKm / 100);

      const usage = order.weightKg / v.capacityKg;
      const capScore = usage >= 0.5 && usage <= 0.95 ? 1 : usage > 0.95 ? 0.4 : 0.55 + usage * 0.5;

      const familiarity = v.routeHistoryCount ?? 0;
      const famScore = Math.min(1, familiarity / 30);

      // Trọng số đã hiệu chỉnh để KHÔNG regress auto-dispatch trên seed 60 đơn:
      // distance 0.45 + warehouse 0.10 (soft) + capacity 0.30 + familiarity 0.15.
      // (Đã đo: số đơn auto-dispatch giữ nguyên 9/21 so với công thức cũ 0.55/0.30/0.15.)
      const score = distScore * 0.45 + whScore * 0.1 + capScore * 0.3 + famScore * 0.15;

      const reasons: string[] = [
        `Cách điểm lấy hàng ${distKm.toFixed(1)} km`,
        `Tải trọng phù hợp ${(usage * 100).toFixed(0)}% (${order.weightKg}/${v.capacityKg} kg)`,
        `Tài xế ${v.driverName} - bằng ${v.driverLicenseClass}, đã chạy ${familiarity} chuyến`,
      ];
      if (whDistKm != null) {
        reasons.push(`Xe cách kho ${whDistKm.toFixed(1)} km`);
      }

      return {
        vehicleId: v.id,
        score: Math.round(score * 100),
        reasons,
        breakdown: {
          dist: Math.round(distScore * 0.45 * 100),
          warehouse: Math.round(whScore * 0.1 * 100),
          capacity: Math.round(capScore * 0.3 * 100),
          familiarity: Math.round(famScore * 0.15 * 100),
        },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return candidates;
}
