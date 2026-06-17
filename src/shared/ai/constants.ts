// Hằng số chi phối hiệu ứng & ngưỡng của lớp "AI giả lập" — tập trung một chỗ để nhất quán toàn app.
// LƯU Ý: đây là PROTOTYPE — mọi "AI" được mô phỏng tất định, KHÔNG gọi LLM/API thật.

/** Tốc độ gõ từng ký tự cho StreamingText (ms/ký tự). */
export const STREAM_CHAR_MS = 16;
/** Khoảng "AI đang suy nghĩ" tối thiểu/tối đa trước khi trả lời (ms). */
export const THINKING_MIN_MS = 650;
export const THINKING_MAX_MS = 1150;
/** Mỗi bước trong banner "AI đang phân tích…" (ms). */
export const ANALYZE_STEP_MS = 520;
/** Tiết lộ tuần tự từng dòng phương án (ms). */
export const STREAM_ROW_MS = 230;

/** Các vai trò được phép thấy lớp AI điều hành (admin-facing). */
export const ADMIN_ROLES = ["ADMIN", "OPS_MANAGER", "DISPATCHER", "SALES"] as const;

/** Bán kính mặc định khi hỏi "quanh khu vực X" (km). */
export const AREA_RADIUS_KM = 25;
