// Dispatch feature constants

/**
 * Ngưỡng điểm tối thiểu (0..100) để AI auto điều phối (mức 3) tự phân xe.
 * Top-1 gợi ý của `suggestVehicles` phải đạt >= ngưỡng này thì mới tự phân;
 * dưới ngưỡng → rớt về điều phối viên (mức 2: AI đề xuất → người chọn).
 */
export const AUTO_DISPATCH_MIN_SCORE = 40;
