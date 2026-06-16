import type { OrderStatus } from "@/shared/types";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Mới",
  PENDING_DISPATCH: "Chờ điều phối",
  PENDING_SUPERVISOR_REVIEW: "Chờ giám sát duyệt",
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
  PENDING_SUPERVISOR_REVIEW: "warning",
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

export function isWaitingReview(s: OrderStatus): boolean {
  return s === "PENDING_SUPERVISOR_REVIEW";
}

export function canEdit(s: OrderStatus): boolean {
  return ["NEW", "PENDING_DISPATCH", "PENDING_ACCEPT", "DISPATCHED"].includes(s);
}

export function canCancel(s: OrderStatus): boolean {
  return !["DELIVERED", "RETURNED", "CANCELLED", "CANCELLED_AFTER_RETURN"].includes(s);
}

/** Nhãn tiếng Việt cho các loại event ghi vào `order.events[]`. Không có → render raw type. */
export const ORDER_EVENT_LABEL: Record<string, string> = {
  CREATED: "Tạo đơn",
  EDITED: "Cập nhật thông tin",
  WEIGHT_ADJUSTED: "Điều chỉnh trọng lượng",
  QUOTA_OVERRIDE: "Override hạn mức",
  CARRIER_SELECTED: "Chọn nhà cung cấp",
  SUPERVISOR_REVIEW_REQUESTED: "Gửi giám sát duyệt",
  SUPERVISOR_REVIEW_APPROVED: "Giám sát duyệt",
  SUPERVISOR_REVIEW_REJECTED: "Giám sát từ chối",
  ASSIGNMENT_PENDING_ACCEPT: "Đã phân, chờ tài xế xác nhận",
  ACCEPTED_BY_DRIVER: "Tài xế đã nhận",
  REJECTED_BY_DRIVER: "Tài xế từ chối",
  AUTO_DISPATCHED: "AI tự động phân xe",
  AUTO_DISPATCH_FAILED: "AI chưa phân được — chờ điều phối viên",
  DRIVER_WARNING: "Tài xế cảnh báo sự cố",
  DISPATCH_REASSIGNED: "Đã tự động phân lại xe khác",
  UNASSIGNED: "Huỷ phân xe",
  PICKED_UP: "Đã lấy hàng",
  IN_TRANSIT: "Bắt đầu giao",
  DELIVERED: "Đã giao",
  DELIVERY_FAILED: "Giao thất bại",
  CANCELLED: "Đã huỷ",
  SPLIT_FROM: "Tách từ đơn gốc",
  SPLIT_INTO: "Tách thành các đơn con",
  STOCK_OUTBOUND: "Xuất kho",
  STOCK_INBOUND_RETURN: "Nhập kho hàng trả",
};
