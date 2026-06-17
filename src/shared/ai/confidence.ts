// Chuẩn hoá "độ tin cậy" 0..100 + dải màu — mọi nơi hiển thị độ tin cậy đi qua đây cho đồng nhất.
import type { ConfidenceBand } from "./types";
import { clamp, jitter } from "./engine";

export const CONFIDENCE_BANDS = {
  high: { min: 85, label: "Cao", className: "text-success" },
  medium: { min: 70, label: "Khá", className: "text-warning" },
  low: { min: 0, label: "Thấp", className: "text-muted-foreground" },
} as const;

export function bandOf(score: number): ConfidenceBand {
  if (score >= CONFIDENCE_BANDS.high.min) return "high";
  if (score >= CONFIDENCE_BANDS.medium.min) return "medium";
  return "low";
}

/**
 * Quy đổi "chất lượng kết quả" → điểm tin cậy 0..100 TẤT ĐỊNH (không random).
 * Nhiều tín hiệu khớp → tin cậy cao; có seed → thêm ±2 cho con số trông thật mà vẫn tái lập.
 */
export function toConfidence(
  signalCount: number,
  opts?: { base?: number; perSignal?: number; seed?: string }
): number {
  const base = opts?.base ?? 78;
  const per = opts?.perSignal ?? 4;
  let v = base + signalCount * per;
  if (opts?.seed) v += jitter(opts.seed, 2);
  return Math.round(clamp(v, 60, 98));
}
