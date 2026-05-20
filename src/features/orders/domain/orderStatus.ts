import type { OrderStatus } from "@/shared/types";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Mới",
  PENDING_DISPATCH: "Chờ điều phối",
  PENDING_ACCEPT: "Chờ tài xế xác nhận",
  DISPATCHED: "Đã phân xe",
  PICKED_UP: "Đã lấy hàng",
  IN_TRANSIT: "Đang giao",
  DELIVERED: "Đã giao",
  DELIVERY_FAILED: "Giao thất bại",
  RETURN_PROCESSING: "Đang xử lý trả",
  RETURNING_TO_WAREHOUSE: "Trả về kho",
  RETURNED: "Đã trả về kho",
  CANCELLED: "Đã hủy",
  CANCELLED_AFTER_RETURN: "Hủy sau khi trả",
};

export const ORDER_STATUS_VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
> = {
  NEW: "secondary",
  PENDING_DISPATCH: "warning",
  PENDING_ACCEPT: "warning",
  DISPATCHED: "default",
  PICKED_UP: "default",
  IN_TRANSIT: "default",
  DELIVERED: "success",
  DELIVERY_FAILED: "destructive",
  RETURN_PROCESSING: "warning",
  RETURNING_TO_WAREHOUSE: "warning",
  RETURNED: "secondary",
  CANCELLED: "outline",
  CANCELLED_AFTER_RETURN: "outline",
};

export function isInProgress(s: OrderStatus): boolean {
  return ["PENDING_ACCEPT", "DISPATCHED", "PICKED_UP", "IN_TRANSIT"].includes(s);
}

export function isPending(s: OrderStatus): boolean {
  return ["NEW", "PENDING_DISPATCH"].includes(s);
}

export function canEdit(s: OrderStatus): boolean {
  return ["NEW", "PENDING_DISPATCH", "PENDING_ACCEPT", "DISPATCHED"].includes(s);
}

export function canCancel(s: OrderStatus): boolean {
  return !["DELIVERED", "RETURNED", "CANCELLED", "CANCELLED_AFTER_RETURN"].includes(s);
}
