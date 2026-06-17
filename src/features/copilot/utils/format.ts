// Nhãn tiếng Việt cho trạng thái đơn + loại sự kiện, dùng chung trong Copilot.
import type { OrderStatus } from "@/shared/types";
import type { StatusTone } from "../types";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Mới",
  PENDING_DISPATCH: "Chờ điều phối",
  PENDING_SUPERVISOR_REVIEW: "Chờ giám sát duyệt",
  PENDING_ACCEPT: "Chờ tài xế nhận",
  DISPATCHED: "Đã phân",
  PICKED_UP: "Đã lấy hàng",
  IN_TRANSIT: "Đang giao",
  PENDING_PAYMENT: "Chờ thanh toán",
  DELIVERED: "Đã giao",
  DELIVERY_FAILED: "Giao thất bại",
  RETURN_PROCESSING: "Đang xử lý trả",
  RETURNING_TO_WAREHOUSE: "Đang về kho",
  RETURNED: "Đã trả",
  CANCELLED: "Đã huỷ",
  CANCELLED_AFTER_RETURN: "Huỷ sau trả",
};

export function statusTone(status: OrderStatus): StatusTone {
  switch (status) {
    case "DELIVERED":
      return "success";
    case "DELIVERY_FAILED":
    case "CANCELLED":
    case "CANCELLED_AFTER_RETURN":
      return "destructive";
    case "PENDING_SUPERVISOR_REVIEW":
    case "PENDING_PAYMENT":
    case "RETURN_PROCESSING":
    case "RETURNING_TO_WAREHOUSE":
      return "warning";
    case "IN_TRANSIT":
    case "PICKED_UP":
    case "DISPATCHED":
    case "PENDING_ACCEPT":
      return "secondary";
    default:
      return "outline";
  }
}

const EVENT_LABEL: Record<string, string> = {
  CREATED: "Tạo đơn",
  CARRIER_SELECTED: "Chọn nhà xe",
  SUPERVISOR_REVIEW_REQUESTED: "Gửi giám sát duyệt",
  AUTO_DISPATCHED: "AI tự điều phối",
  DISPATCH_REASSIGNED: "Điều phối lại",
  AUTO_DISPATCH_FAILED: "AI không phân được",
  ASSIGNMENT_PENDING_ACCEPT: "Chờ tài xế nhận",
  ACCEPTED_BY_DRIVER: "Tài xế nhận đơn",
  DRIVER_WARNING: "Tài xế cảnh báo",
  STATUS_CHANGE: "Đổi trạng thái",
  WEIGHT_ADJUSTED: "Điều chỉnh cân nặng",
  PICKED_UP: "Lấy hàng tại kho",
  DELIVERED: "Giao thành công",
  DELIVERY_FAILED: "Giao thất bại",
  COD_TRANSFER_SUBMITTED: "Khách báo chuyển khoản",
  COD_PAID: "Đã nhận thanh toán",
  RETURNED: "Đã trả hàng",
};

export function eventLabel(type: string): string {
  return EVENT_LABEL[type] ?? type;
}

export function codStatusLabel(status?: "PENDING" | "VERIFYING" | "PAID"): string {
  if (status === "PAID") return "đã thanh toán";
  if (status === "VERIFYING") return "đang đối soát";
  return "chờ thu";
}
