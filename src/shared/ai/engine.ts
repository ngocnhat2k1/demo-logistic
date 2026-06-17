// Lõi engine tất định cho lớp AI giả lập: chuẩn hoá văn bản, hash → jitter ổn định, chấm keyword.
// TẤT ĐỊNH: cùng input → cùng output (seed theo chuỗi, KHÔNG dùng Math.random ở runtime).
import { mulberry32 } from "@/shared/utils";

// Dải dấu kết hợp (combining diacritics) U+0300–U+036F. Dùng new RegExp với code point tường minh
// để tránh nhúng ký tự kết hợp vào source (gây lint no-misleading-character-class).
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

/** Bỏ dấu tiếng Việt + lowercase để so khớp linh hoạt ("Bình Dương" ~ "binh duong"). */
export function normalizeVi(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

/** Hash chuỗi → uint32 tất định (FNV-1a). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Số "ngẫu nhiên" tất định trong [0,1) seed theo chuỗi id. */
export function seededUnit(seed: string): number {
  return mulberry32(hashString(seed))();
}

/** Dao động tất định trong [-amp, amp] seed theo id — cho con số "trông thật" mà vẫn tái lập. */
export function jitter(seed: string, amp: number): number {
  return (seededUnit(seed) * 2 - 1) * amp;
}

/** Đếm số keyword (đã normalize) xuất hiện trong text (đã normalize). */
export function countKeywordHits(normText: string, keywords: readonly string[]): number {
  let n = 0;
  for (const k of keywords) if (k && normText.includes(k)) n++;
  return n;
}

export const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
