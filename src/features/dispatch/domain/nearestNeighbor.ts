// Sắp thứ tự điểm dừng tham lam (nearest-neighbor) — thuần, tất định.
import type { LatLng } from "@/shared/types";
import { haversine } from "@/shared/utils";

export function orderStops(
  start: LatLng,
  points: { id: string; loc: LatLng }[]
): { order: string[]; totalKm: number } {
  const remaining = [...points];
  const seq: string[] = [];
  let cur = start;
  let total = 0;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(cur, remaining[i].loc);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    total += bestDist;
    cur = remaining[bestIdx].loc;
    seq.push(remaining[bestIdx].id);
    remaining.splice(bestIdx, 1);
  }
  return { order: seq, totalKm: total };
}
