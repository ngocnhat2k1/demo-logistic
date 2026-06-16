"use client";

import { useMemo } from "react";
import { useDataStore } from "@/shared/stores/data";
import { useUIStore } from "@/shared/stores/ui";
import type { Order, Vehicle, ReturnOrder, StockMovement } from "@/shared/types";

/**
 * Trạng thái scoping kho hiện tại.
 * - `isAll === true`  → không lọc (chế độ "Tất cả kho" hoặc chưa chọn).
 * - `warehouseId`     → id kho cụ thể đang chọn (null/"ALL" khi isAll).
 */
export function useWarehouseScope(): { warehouseId: string | null; isAll: boolean } {
  const id = useUIStore((s) => s.currentWarehouseId);
  const isAll = id === "ALL" || id == null;
  return { warehouseId: isAll ? null : (id as string), isAll };
}

/** Đơn hàng đã lọc theo kho hiện tại. */
export function useScopedOrders(): Order[] {
  const orders = useDataStore((s) => s.orders);
  const { warehouseId, isAll } = useWarehouseScope();
  return useMemo(
    () => (isAll ? orders : orders.filter((o) => o.warehouseId === warehouseId)),
    [orders, warehouseId, isAll]
  );
}

/**
 * CHỈ HIỂN THỊ — lọc xe theo kho nhà (homeWarehouseId).
 * Điều phối (chọn xe) KHÔNG dùng hook này — luôn đọc full `s.vehicles`.
 */
export function useScopedVehicles(): Vehicle[] {
  const vehicles = useDataStore((s) => s.vehicles);
  const { warehouseId, isAll } = useWarehouseScope();
  return useMemo(
    () => (isAll ? vehicles : vehicles.filter((v) => v.homeWarehouseId === warehouseId)),
    [vehicles, warehouseId, isAll]
  );
}

/** Phiếu trả hàng đã lọc theo kho của đơn gốc (join qua originalOrderId → order.warehouseId). */
export function useScopedReturns(): ReturnOrder[] {
  const returns = useDataStore((s) => s.returns);
  const orders = useDataStore((s) => s.orders);
  const { warehouseId, isAll } = useWarehouseScope();
  return useMemo(() => {
    if (isAll) return returns;
    const orderWh = new Map(orders.map((o) => [o.id, o.warehouseId]));
    return returns.filter((r) => orderWh.get(r.originalOrderId) === warehouseId);
  }, [returns, orders, warehouseId, isAll]);
}

/** Giao dịch tồn kho đã lọc theo kho hiện tại. */
export function useScopedMovements(): StockMovement[] {
  const movements = useDataStore((s) => s.stockMovements);
  const { warehouseId, isAll } = useWarehouseScope();
  return useMemo(
    () => (isAll ? movements : movements.filter((m) => m.warehouseId === warehouseId)),
    [movements, warehouseId, isAll]
  );
}
