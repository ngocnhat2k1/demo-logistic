import type { OrderItem, StockMovement } from "@/shared/types";

/**
 * Derive tồn kho hiện tại của một kho từ sổ cái StockMovement (append-only).
 * Trả về map { productId -> số lượng }. Gọi một lần (useMemo), không gọi trong .map.
 */
export function getWarehouseStock(
  movements: StockMovement[],
  warehouseId: string
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of movements) {
    if (m.warehouseId !== warehouseId) continue;
    out[m.productId] = (out[m.productId] ?? 0) + m.qtyDelta;
  }
  return out;
}

/** Tổng trọng lượng suy ra từ các dòng hàng (line-items). */
export function deriveItemsWeight(items: OrderItem[]): number {
  return items.reduce((sum, it) => sum + it.unitWeightKg * it.quantity, 0);
}
