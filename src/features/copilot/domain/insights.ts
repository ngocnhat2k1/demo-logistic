// Sinh auto-insight cho Dashboard (cùng dữ liệu store với Copilot → luôn nhất quán). Tất định.
import type { Order } from "@/shared/types";
import type { AiSeverity, Insight } from "@/shared/ai/types";
import { STATIC_CHIPS } from "../constants";
import type { CopilotData } from "./handlers";

const ACTIVE_LATE = ["PENDING_DISPATCH", "PENDING_ACCEPT", "PENDING_SUPERVISOR_REVIEW", "DISPATCHED", "PICKED_UP", "IN_TRANSIT"];
const SEVERITY_RANK: Record<AiSeverity, number> = { danger: 3, warning: 2, info: 1, success: 0 };

export function generateInsights(data: CopilotData): Insight[] {
  const out: Insight[] = [];
  const now = Date.now();

  const lateCount = data.orders.filter(
    (o) => ACTIVE_LATE.includes(o.status) && o.requestedDeliveryAt && new Date(o.requestedDeliveryAt).getTime() < now
  ).length;
  if (lateCount > 0) {
    out.push({
      id: "insight-late",
      severity: "warning",
      title: "Đơn trễ hẹn",
      sentence: `AI phát hiện ${lateCount} đơn đang trễ hẹn giao — nên ưu tiên xử lý.`,
      cta: { label: "Hỏi Copilot", prompt: "Đơn nào đang trễ?" },
    });
  }

  const fallbackCount = data.orders.filter((o) => o.dispatchFallback).length;
  if (fallbackCount > 0) {
    out.push({
      id: "insight-fallback",
      severity: "warning",
      title: "Đơn rớt điều phối",
      sentence: `${fallbackCount} đơn AI chưa tự phân được, cần điều phối viên xử lý tay.`,
      cta: { label: "Mở bảng điều phối", href: "/dispatch" },
    });
  }

  const nearQuota = data.customers
    .filter((c) => c.quota.type !== "POSTPAID" && c.quota.limit > 0)
    .map((c) => ({ c, r: (c.quota.reserved + c.quota.used) / c.quota.limit }))
    .filter((x) => x.r >= 0.9)
    .sort((a, b) => b.r - a.r);
  if (nearQuota[0]) {
    const { c, r } = nearQuota[0];
    const pct = Math.round(r * 100);
    out.push({
      id: "insight-quota",
      severity: r >= 1 ? "danger" : "warning",
      title: "Cảnh báo hạn mức",
      sentence: `KH "${c.name}" đã dùng ${pct}% hạn mức — dự báo sắp vượt.`,
      cta: { label: "Xem khách hàng", href: `/customers/${c.id}` },
    });
  }

  const openSos = data.sos.filter((s) => !s.resolved).length;
  if (openSos > 0) {
    out.push({
      id: "insight-sos",
      severity: "danger",
      title: "Cảnh báo SOS",
      sentence: `${openSos} tài xế đang phát tín hiệu SOS chưa được xử lý.`,
      cta: { label: "Mở bảng điều phối", href: "/dispatch" },
    });
  }

  const autoCount = data.orders.filter((o) => o.events.some((e) => e.type === "AUTO_DISPATCHED")).length;
  if (autoCount > 0) {
    out.push({
      id: "insight-auto",
      severity: "success",
      title: "Hiệu suất AI điều phối",
      sentence: `AI đã tự điều phối ${autoCount} đơn, giảm tải cho điều phối viên.`,
      cta: { label: "Xem tóm tắt", prompt: "Tóm tắt hôm nay" },
    });
  }

  return out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]).slice(0, 3);
}

/** Chip gợi ý ban đầu — nối thêm 1 chip "gợi ý điều phối" theo đơn đang chờ thật (nếu có). */
export function defaultPrompts(orders: Order[]): string[] {
  const pending = orders.find((o) => o.status === "NEW" || o.status === "PENDING_DISPATCH");
  const chips = [...STATIC_CHIPS];
  if (pending) chips.push(`Gợi ý điều phối đơn ${pending.code}`);
  return chips;
}
