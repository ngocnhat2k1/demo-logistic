// Trích entity từ câu hỏi: mã đơn, địa danh, khung thời gian. Tất định, không gọi mạng.
import { PLACES, type PlaceKey } from "@/shared/mock/geo";
import { normalizeVi } from "@/shared/ai/engine";
import type { LatLng } from "@/shared/types";

export interface ExtractedEntities {
  orderCode?: string;
  placeKeys?: PlaceKey[];
  placeLabel?: string;
  placeCenter?: LatLng;
  timeframe?: "today" | "week";
}

/** "dh12" / "DH-0012" / "đơn dh 12" → "DH-0012". */
export function extractOrderCode(text: string): string | undefined {
  const m = text.match(/dh[-\s]?0*(\d{1,4})/i);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n)) return undefined;
  return `DH-${String(n).padStart(4, "0")}`;
}

const PLACE_ALIASES: { aliases: string[]; keys: PlaceKey[]; label: string }[] = [
  { aliases: ["di an"], keys: ["BD_DI_AN"], label: "Dĩ An, Bình Dương" },
  { aliases: ["thu dau mot"], keys: ["BD_THU_DAU_MOT"], label: "Thủ Dầu Một" },
  { aliases: ["binh duong"], keys: ["BD_THU_DAU_MOT", "BD_DI_AN"], label: "Bình Dương" },
  { aliases: ["bien hoa", "dong nai"], keys: ["DN_BIEN_HOA"], label: "Biên Hòa, Đồng Nai" },
  { aliases: ["thu duc"], keys: ["HCM_THU_DUC"], label: "Thủ Đức" },
  { aliases: ["quan 1", "q1"], keys: ["HCM_QUAN_1"], label: "Quận 1" },
  { aliases: ["quan 7", "q7"], keys: ["HCM_QUAN_7"], label: "Quận 7" },
  { aliases: ["tan binh"], keys: ["HCM_KHO_TAN_BINH"], label: "Tân Bình" },
  {
    aliases: ["ho chi minh", "tphcm", "tp hcm", "hcm", "sai gon"],
    keys: ["HCM_QUAN_1", "HCM_QUAN_7", "HCM_THU_DUC", "HCM_KHO_TAN_BINH"],
    label: "TP.HCM",
  },
  { aliases: ["vung tau"], keys: ["VT_VUNG_TAU"], label: "Vũng Tàu" },
  { aliases: ["long an", "tan an"], keys: ["LA_TAN_AN"], label: "Long An" },
  { aliases: ["can tho"], keys: ["CT_CAN_THO"], label: "Cần Thơ" },
];

function avgCenter(keys: PlaceKey[]): LatLng {
  const lat = keys.reduce((s, k) => s + PLACES[k].lat, 0) / keys.length;
  const lng = keys.reduce((s, k) => s + PLACES[k].lng, 0) / keys.length;
  return { lat, lng };
}

function extractPlaces(normText: string): Pick<ExtractedEntities, "placeKeys" | "placeLabel" | "placeCenter"> {
  for (const entry of PLACE_ALIASES) {
    if (entry.aliases.some((a) => normText.includes(a))) {
      return { placeKeys: entry.keys, placeLabel: entry.label, placeCenter: avgCenter(entry.keys) };
    }
  }
  return {};
}

function extractTimeframe(normText: string): "today" | "week" | undefined {
  if (normText.includes("hom nay")) return "today";
  if (normText.includes("tuan")) return "week";
  return undefined;
}

export function extractEntities(text: string): ExtractedEntities {
  const norm = normalizeVi(text);
  return {
    orderCode: extractOrderCode(text),
    ...extractPlaces(norm),
    timeframe: extractTimeframe(norm),
  };
}
