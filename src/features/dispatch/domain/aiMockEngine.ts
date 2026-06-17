// Điểm vào duy nhất của "bộ não AI giả lập" cho bảng điều phối. Thuần, tất định, memo theo input.
import type { Order, Vehicle, Warehouse } from "@/shared/types";
import { suggestVehicles, type VehicleSuggestion } from "./dispatchHeuristic";
import { computeRiskScore, type RiskResult } from "./riskScore";
import { predictEta, type EtaResult } from "./etaPredict";
import { buildClusters, type RouteCluster } from "./consolidate";

export interface PerOrderAi {
  suggestion: VehicleSuggestion | null;
  topPlate?: string;
  topDriver?: string;
  risk: RiskResult;
  eta: EtaResult;
}

export interface AiAnalysis {
  perOrder: Map<string, PerOrderAi>;
  clusters: RouteCluster[];
}

export function analyzeBoard(args: {
  orders: Order[];
  allOrders: Order[];
  vehicles: Vehicle[];
  warehouses: Warehouse[];
  nowIso: string;
}): AiAnalysis {
  const { orders, allOrders, vehicles, warehouses, nowIso } = args;
  // Gợi ý + độ tin cậy hiển thị xét TOÀN BỘ xe khả dụng (suggestVehicles tự lọc AVAILABLE + đủ tải).
  // Khi bấm "Phân xe này", luồng submitOrderCarrier vẫn áp gate NCC dự phòng → giám sát duyệt.
  const pool = vehicles;
  const perOrder = new Map<string, PerOrderAi>();

  for (const o of orders) {
    const warehouse = warehouses.find((w) => w.id === o.warehouseId) ?? null;
    const sugg = suggestVehicles({ order: o, vehicles: pool, warehouse });
    const top = sugg[0] ?? null;
    const eta = predictEta(o.pickup, o.dropoff, nowIso, o.weightKg, o.requestedDeliveryAt);
    const risk = computeRiskScore(o, allOrders, eta.lateMinutes);
    const v = top ? vehicles.find((x) => x.id === top.vehicleId) : undefined;
    perOrder.set(o.id, { suggestion: top, topPlate: v?.plateNumber, topDriver: v?.driverName, risk, eta });
  }

  const clusters = buildClusters(orders, vehicles, warehouses);
  return { perOrder, clusters };
}
