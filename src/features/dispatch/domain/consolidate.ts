// Gom đơn cùng khu vực thành "cụm tuyến" cho 1 xe + sắp điểm dừng tối ưu. Thuần, tất định.
import type { Order, Vehicle, Warehouse, LatLng } from "@/shared/types";
import { haversine } from "@/shared/utils";
import { suggestVehicles } from "./dispatchHeuristic";
import { orderStops } from "./nearestNeighbor";
import { CLUSTER_RADIUS_KM } from "../constants";

export interface RouteClusterStop {
  orderId: string;
  orderCode: string;
  address: string;
}

export interface RouteCluster {
  id: string;
  orderIds: string[];
  orders: Order[];
  vehicle: Vehicle | null;
  totalKg: number;
  savedKm: number;
  stops: RouteClusterStop[];
}

export function buildClusters(pending: Order[], vehicles: Vehicle[], warehouses: Warehouse[]): RouteCluster[] {
  const eligible = pending.filter(
    (o) => (o.status === "NEW" || o.status === "PENDING_DISPATCH") && (o.direction ?? "OUTBOUND") === "OUTBOUND"
  );
  // Sắp ổn định theo toạ độ để cụm tái lập y hệt mỗi lần.
  const sorted = [...eligible].sort((a, b) => a.dropoff.lat - b.dropoff.lat || a.dropoff.lng - b.dropoff.lng);
  const used = new Set<string>();
  const clusters: RouteCluster[] = [];

  for (const seed of sorted) {
    if (used.has(seed.id)) continue;
    const group: Order[] = [seed];
    for (const o of sorted) {
      if (o.id === seed.id || used.has(o.id)) continue;
      if (o.warehouseId !== seed.warehouseId) continue;
      if (haversine(seed.dropoff, o.dropoff) <= CLUSTER_RADIUS_KM) group.push(o);
    }
    if (group.length < 2) continue; // cụm <2 đơn → để luồng đơn lẻ xử lý

    group.forEach((o) => used.add(o.id));
    const totalKg = group.reduce((s, o) => s + o.weightKg, 0);

    const warehouse = warehouses.find((w) => w.id === seed.warehouseId) ?? null;
    const start: LatLng = warehouse ? { lat: warehouse.location.lat, lng: warehouse.location.lng } : seed.pickup;

    // Xe đề xuất: AVAILABLE đủ tải tổng, chọn theo suggestVehicles trên đơn nặng nhất.
    const heaviest = [...group].sort((a, b) => b.weightKg - a.weightKg)[0];
    const capablePool = vehicles.filter((v) => v.status === "AVAILABLE" && v.capacityKg >= totalKg);
    const sugg = suggestVehicles({ order: heaviest, vehicles: capablePool, warehouse });
    const vehicle = sugg[0] ? vehicles.find((v) => v.id === sugg[0].vehicleId) ?? null : null;

    const seq = orderStops(start, group.map((o) => ({ id: o.id, loc: o.dropoff })));
    const separateKm = group.reduce((s, o) => s + haversine(start, o.dropoff), 0);
    const savedKm = Math.max(0, separateKm - seq.totalKm);

    const byId = new Map(group.map((o) => [o.id, o]));
    const stops: RouteClusterStop[] = seq.order.map((id) => {
      const o = byId.get(id)!;
      return { orderId: o.id, orderCode: o.code, address: o.dropoff.address };
    });

    clusters.push({
      id: `cluster-${seed.id}`,
      orderIds: group.map((o) => o.id),
      orders: group,
      vehicle,
      totalKg,
      savedKm,
      stops,
    });
  }

  return clusters.sort((a, b) => b.savedKm - a.savedKm);
}
