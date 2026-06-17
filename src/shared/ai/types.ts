// Kiểu dùng chung cho lớp AI giả lập. Tham chiếu kiểu nghiệp vụ từ @/shared/types khi cần.

export type ConfidenceBand = "high" | "medium" | "low";

export type AiSeverity = "info" | "success" | "warning" | "danger";

/** Một "lý do" do AI đưa ra — dùng cho giải thích điểm số / gợi ý. */
export interface AiReason {
  label: string;
  /** Điểm cộng/trừ (nếu là yếu tố chấm điểm). */
  delta?: number;
  /** true = yếu tố tích cực (✓ xanh); false = yếu tố rủi ro (⚠ hổ phách). Mặc định true. */
  positive?: boolean;
}

/** Kết quả chấm điểm tổng quát (rủi ro, tín dụng, gợi ý…). */
export interface AiScore {
  score: number; // 0..100
  level: string; // nhãn tiếng Việt: Thấp/Trung bình/Cao…
  reasons: AiReason[];
}

/** Một "insight" tự sinh (card cảnh báo/khuyến nghị). */
export interface Insight {
  id: string;
  severity: AiSeverity;
  title: string;
  sentence: string;
  cta?: { label: string; href?: string; prompt?: string };
}
