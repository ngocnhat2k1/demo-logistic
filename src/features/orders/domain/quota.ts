import type { Customer, Quota } from "@/shared/types";

export interface QuotaCheck {
  ok: boolean;
  reason?: string;
  level: "ok" | "warn" | "block";
  ratio: number; // current usage ratio (reserved+used)/limit
  newRatio: number; // (reserved+used+addKg)/limit
}

const POSTPAID_OUTSTANDING_WARN_KG = 50_000; // 50 tấn

export function quotaInUse(q: Quota): number {
  return (q.reserved ?? 0) + q.used;
}

export function availableQuota(q: Quota): number {
  if (q.type === "POSTPAID") return Number.POSITIVE_INFINITY;
  return Math.max(0, q.limit - quotaInUse(q));
}

export function checkQuota(customer: Customer, addKg: number): QuotaCheck {
  const q = customer.quota;

  if (q.type === "POSTPAID") {
    const outstanding = q.outstanding ?? 0;
    const projectedOutstanding = outstanding + addKg;
    if (projectedOutstanding >= POSTPAID_OUTSTANDING_WARN_KG) {
      return {
        ok: true,
        level: "warn",
        reason: `Khách công nợ cao (${formatKgShort(projectedOutstanding)}) — cân nhắc thu hồi`,
        ratio: 0,
        newRatio: 0,
      };
    }
    return { ok: true, level: "ok", ratio: 0, newRatio: 0 };
  }

  const inUse = quotaInUse(q);
  const projected = inUse + addKg;
  const ratio = q.limit > 0 ? inUse / q.limit : 1;
  const newRatio = q.limit > 0 ? projected / q.limit : 1;

  if (projected > q.limit) {
    return {
      ok: false,
      level: "block",
      reason: `Vượt hạn mức: ${formatKgShort(projected)} / ${formatKgShort(q.limit)} (đã giữ ${formatKgShort(q.reserved ?? 0)} + đã dùng ${formatKgShort(q.used)})`,
      ratio,
      newRatio,
    };
  }
  if (newRatio >= 0.9) {
    return {
      ok: true,
      level: "warn",
      reason: `Sắp đầy hạn mức (${Math.round(newRatio * 100)}%)`,
      ratio,
      newRatio,
    };
  }
  return { ok: true, level: "ok", ratio, newRatio };
}

export function quotaLevelColor(q: Quota): "ok" | "warn" | "danger" {
  if (q.type === "POSTPAID") {
    const outstanding = q.outstanding ?? 0;
    if (outstanding >= POSTPAID_OUTSTANDING_WARN_KG) return "danger";
    if (outstanding >= POSTPAID_OUTSTANDING_WARN_KG * 0.6) return "warn";
    return "ok";
  }
  const inUse = quotaInUse(q);
  const r = q.limit > 0 ? inUse / q.limit : 0;
  if (r >= 1) return "danger";
  if (r >= 0.85) return "warn";
  return "ok";
}

export function quotaUsageRatio(q: Quota): number {
  if (q.type === "POSTPAID") return 0;
  return q.limit > 0 ? quotaInUse(q) / q.limit : 0;
}

export function quotaLabel(q: Quota): string {
  switch (q.type) {
    case "POSTPAID":
      return "Thanh toán sau";
    case "MONTHLY":
      return "Theo tháng";
    case "PREPAID":
      return "Trả trước";
  }
}

function formatKgShort(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(kg % 1000 === 0 ? 0 : 2)}T`;
  return `${kg.toLocaleString("vi-VN")} kg`;
}
