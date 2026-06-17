// Helper sinh câu chữ tiếng Việt giọng "AI" — chuẩn hoá toàn bộ văn bản người-dùng-thấy.
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

/** Ghép template "{var}" với biến. Thiếu biến → chuỗi rỗng. */
export function composeSentence(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

/** "12 đơn" — số định dạng vi-VN + danh từ (tiếng Việt không biến đổi số nhiều). */
export function pluralVi(n: number, noun: string): string {
  return `${n.toLocaleString("vi-VN")} ${noun}`;
}

/** "3 giờ trước" — khoảng thời gian tương đối, locale vi. */
export function relativeTime(at: string | Date): string {
  try {
    return formatDistanceToNow(new Date(at), { addSuffix: true, locale: vi });
  } catch {
    return "—";
  }
}

/** "14:25" — giờ:phút. */
export function formatClock(at: string | Date): string {
  try {
    return new Date(at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}
