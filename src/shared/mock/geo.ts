import type { LatLng } from "@/shared/types";

export const PLACES = {
  HCM_KHO_TAN_BINH: { lat: 10.8011, lng: 106.6529, name: "Kho Tân Bình, HCM" },
  HCM_QUAN_1: { lat: 10.7769, lng: 106.7009, name: "Quận 1, HCM" },
  HCM_QUAN_7: { lat: 10.7378, lng: 106.7218, name: "Quận 7, HCM" },
  HCM_THU_DUC: { lat: 10.8497, lng: 106.7716, name: "Thủ Đức, HCM" },
  BD_THU_DAU_MOT: { lat: 10.9803, lng: 106.6519, name: "Thủ Dầu Một, Bình Dương" },
  BD_DI_AN: { lat: 10.9056, lng: 106.7728, name: "Dĩ An, Bình Dương" },
  DN_BIEN_HOA: { lat: 10.9574, lng: 106.8426, name: "Biên Hòa, Đồng Nai" },
  VT_VUNG_TAU: { lat: 10.346, lng: 107.084, name: "Vũng Tàu" },
  LA_TAN_AN: { lat: 10.5346, lng: 106.4116, name: "Tân An, Long An" },
  CT_CAN_THO: { lat: 10.0452, lng: 105.7469, name: "Cần Thơ" },
};

export type PlaceKey = keyof typeof PLACES;

const interp = (a: LatLng, b: LatLng, t: number): LatLng => ({
  lat: a.lat + (b.lat - a.lat) * t,
  lng: a.lng + (b.lng - a.lng) * t,
});

export function buildPolyline(from: LatLng, to: LatLng, steps = 12): LatLng[] {
  const pts: LatLng[] = [];
  const jitterScale = 0.012;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const base = interp(from, to, t);
    // subtle deterministic curve
    const offset = Math.sin(t * Math.PI) * jitterScale;
    pts.push({ lat: base.lat + offset, lng: base.lng + offset * 0.5 });
  }
  return pts;
}

export function placeToLocation(key: PlaceKey, contactName?: string, phone?: string) {
  const p = PLACES[key];
  return { address: p.name, lat: p.lat, lng: p.lng, contactName, contactPhone: phone };
}
