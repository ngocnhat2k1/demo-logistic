// Dispatch feature constants

/**
 * Ngưỡng điểm tối thiểu (0..100) để AI auto điều phối (mức 3) tự phân xe.
 * Top-1 gợi ý của `suggestVehicles` phải đạt >= ngưỡng này thì mới tự phân;
 * dưới ngưỡng → rớt về điều phối viên (mức 2: AI đề xuất → người chọn).
 */
export const AUTO_DISPATCH_MIN_SCORE = 40;

// ----- Smart Dispatch (AI Mode) — hằng số mô phỏng (tất định) -----
/** Tốc độ trung bình giả định để ước ETA (km/h). */
export const AVG_SPEED_KMH = 32;
/** Thời gian phục vụ tại mỗi điểm dừng (phút). */
export const STOP_SERVICE_MINUTES = 15;
/** Bán kính gom cụm theo khoảng cách điểm giao (km). */
export const CLUSTER_RADIUS_KM = 6;
/** Ngưỡng phân loại mức rủi ro. */
export const RISK_THRESHOLDS = { medium: 34, high: 67 } as const;
