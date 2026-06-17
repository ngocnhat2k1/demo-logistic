// Bộ so khớp ý định TẤT ĐỊNH: chấm điểm theo keyword (đã bỏ dấu) + thưởng khi có entity bắt buộc.
import { normalizeVi, countKeywordHits } from "@/shared/ai/engine";
import type { ExtractedEntities } from "./entities";

export type IntentId =
  | "ORDERS_LATE"
  | "FLEET_AVAILABLE"
  | "WHY_RETURNED"
  | "TODAY_SUMMARY"
  | "SUGGEST_DISPATCH"
  | "ORDER_STATUS"
  | "CUSTOMER_QUOTA"
  | "FALLBACK";

interface IntentDef {
  id: IntentId;
  keywords: string[]; // đã normalize (không dấu)
  needsOrderCode?: boolean;
  needsPlace?: boolean;
}

const INTENTS: IntentDef[] = [
  { id: "WHY_RETURNED", keywords: ["vi sao", "tai sao", "ly do", "bi tra", "tra hang", "tra ve", "that bai", "hoan"], needsOrderCode: true },
  { id: "SUGGEST_DISPATCH", keywords: ["goi y", "dieu phoi", "phan xe", "phan cong", "chon xe", "nen dung xe"], needsOrderCode: true },
  { id: "ORDER_STATUS", keywords: ["trang thai", "tinh trang", "dang o dau", "den dau", "status", "thong tin don"], needsOrderCode: true },
  { id: "FLEET_AVAILABLE", keywords: ["xe ranh", "xe trong", "xe san sang", "xe nao", "con xe", "xe gan", "available"], needsPlace: true },
  { id: "TODAY_SUMMARY", keywords: ["tom tat", "tong quan", "hom nay", "bao cao nhanh", "tinh hinh", "tong ket"] },
  { id: "ORDERS_LATE", keywords: ["tre", "qua hen", "cham gio", "delay", "tre hen", "muon gio", "sap tre"] },
  { id: "CUSTOMER_QUOTA", keywords: ["han muc", "quota", "cong no", "han muc con", "vo han muc"] },
];

/** Trả intent điểm cao nhất; dưới ngưỡng → FALLBACK. */
export function matchIntent(text: string, entities: ExtractedEntities): { id: IntentId; score: number } {
  const norm = normalizeVi(text);
  let best: { id: IntentId; score: number } = { id: "FALLBACK", score: 0 };
  for (const def of INTENTS) {
    let score = countKeywordHits(norm, def.keywords) * 2;
    if (def.needsOrderCode && entities.orderCode) score += 2;
    if (def.needsPlace && entities.placeKeys && entities.placeKeys.length > 0) score += 1.5;
    if (score > best.score) best = { id: def.id, score };
  }
  if (best.score < 2) return { id: "FALLBACK", score: best.score };
  return best;
}
