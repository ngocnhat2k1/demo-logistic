// Tính độ trễ "AI đang suy nghĩ" TẤT ĐỊNH theo nội dung (không random) để demo tái lập được.
import { THINKING_MIN_MS, THINKING_MAX_MS } from "./constants";
import { hashString } from "./engine";

/** Delay trong [THINKING_MIN_MS, THINKING_MAX_MS] suy ra từ chuỗi seed (vd nội dung câu hỏi). */
export function thinkingDelay(seed: string): number {
  const span = THINKING_MAX_MS - THINKING_MIN_MS;
  return THINKING_MIN_MS + (hashString(seed) % (span + 1));
}
