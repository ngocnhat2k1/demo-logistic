// Chấm điểm rủi ro giao thất bại TẤT ĐỊNH (cộng dồn yếu tố + jitter seed theo order.id).
import type { Order } from "@/shared/types";
import { haversine, formatKg, formatVnd } from "@/shared/utils";
import { jitter, clamp } from "@/shared/ai/engine";
import type { AiReason } from "@/shared/ai/types";
import { RISK_THRESHOLDS } from "../constants";

export type RiskLevel = "Thấp" | "Trung bình" | "Cao";
export interface RiskResult {
  score: number;
  level: RiskLevel;
  factors: AiReason[];
}

/** Tính điểm rủi ro 0..100 cho một đơn. allOrders để đếm lịch sử giao hỏng của khách. */
export function computeRiskScore(order: Order, allOrders: Order[], etaLateMinutes = 0): RiskResult {
  const factors: AiReason[] = [];
  let score = 8;

  const distKm = haversine(order.pickup, order.dropoff);
  const distAdd = Math.min(40, distKm * 0.6);
  if (distAdd >= 5) {
    score += distAdd;
    factors.push({ label: `Quãng đường xa ${distKm.toFixed(0)} km`, delta: Math.round(distAdd), positive: false });
  }

  if (order.weightKg > 5000) {
    score += 18;
    factors.push({ label: `Hàng rất nặng ${formatKg(order.weightKg)}`, delta: 18, positive: false });
  } else if (order.weightKg > 2000) {
    score += 10;
    factors.push({ label: `Hàng nặng ${formatKg(order.weightKg)}`, delta: 10, positive: false });
  }

  if (order.codAmount && order.codAmount > 0) {
    score += 10;
    factors.push({ label: `Có thu hộ ${formatVnd(order.codAmount)}`, delta: 10, positive: false });
    if (order.codAmount > 3_000_000) {
      score += 8;
      factors.push({ label: "Thu hộ giá trị lớn — dễ bị từ chối nhận", delta: 8, positive: false });
    }
  }

  if (etaLateMinutes > 0) {
    const add = Math.min(25, etaLateMinutes / 15);
    score += add;
    factors.push({ label: `Dự báo trễ hẹn ~${Math.round(etaLateMinutes)} phút`, delta: Math.round(add), positive: false });
  }

  const warn = order.warningCount ?? 0;
  if (warn > 0) {
    score += warn * 12;
    factors.push({ label: `Tài xế đã cảnh báo ${warn} lần`, delta: warn * 12, positive: false });
  }

  const custFails = allOrders.filter(
    (o) =>
      o.customerId === order.customerId &&
      (o.status === "DELIVERY_FAILED" || o.events.some((e) => e.type === "DELIVERY_FAILED"))
  ).length;
  if (custFails > 0) {
    score += custFails * 12;
    factors.push({ label: `Khách từng ${custFails} lần giao hỏng`, delta: custFails * 12, positive: false });
  }

  if (order.dispatchFallback) {
    score += 10;
    factors.push({ label: "AI từng không phân được xe cho đơn", delta: 10, positive: false });
  }

  if (
    order.actualWeightKg &&
    order.declaredWeightKg &&
    Math.abs(order.actualWeightKg - order.declaredWeightKg) / order.declaredWeightKg > 0.1
  ) {
    score += 8;
    factors.push({ label: "Lệch cân so với khai báo", delta: 8, positive: false });
  }

  score += jitter(order.id, 3);
  score = Math.round(clamp(score, 0, 100));
  const level: RiskLevel = score >= RISK_THRESHOLDS.high ? "Cao" : score >= RISK_THRESHOLDS.medium ? "Trung bình" : "Thấp";
  return { score, level, factors };
}
