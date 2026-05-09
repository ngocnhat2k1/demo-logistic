import type { Customer, Quota } from "@/types";

export interface QuotaCheck {
  ok: boolean;
  reason?: string;
  level: "ok" | "warn" | "block";
  ratio: number; // current usage ratio
  newRatio: number;
}

export function checkQuota(customer: Customer, addKg: number): QuotaCheck {
  const q = customer.quota;
  const projected = q.used + addKg;
  const ratio = q.limit > 0 ? q.used / q.limit : 1;
  const newRatio = q.limit > 0 ? projected / q.limit : 1;

  if (projected > q.limit) {
    return {
      ok: false,
      level: "block",
      reason: `Vượt hạn mức: ${projected.toLocaleString()} / ${q.limit.toLocaleString()} kg`,
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
  const r = q.limit > 0 ? q.used / q.limit : 0;
  if (r >= 1) return "danger";
  if (r >= 0.85) return "warn";
  return "ok";
}

export function quotaLabel(q: Quota): string {
  switch (q.type) {
    case "POSTPAID":
      return "Trả sau (cấp hạn mức)";
    case "MONTHLY":
      return "Theo tháng";
    case "PREPAID":
      return "Trả trước";
  }
}
