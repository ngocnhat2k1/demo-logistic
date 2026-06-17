"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/shared/types";

/** True khi cả lat & lng đều là số hữu hạn — chặn NaN/undefined/Infinity lọt vào Leaflet (gây crash "Invalid LatLng"). */
const isFiniteLatLng = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lng);

// Inline marker icon (data URI) to avoid bundler asset issues
const MARKER_DATA_URL =
  "data:image/svg+xml;base64," +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
  <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#2563eb"/>
  <circle cx="12.5" cy="12.5" r="5" fill="white"/>
</svg>`);

const PIN_RED =
  "data:image/svg+xml;base64," +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
  <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#dc2626"/>
  <circle cx="12.5" cy="12.5" r="5" fill="white"/>
</svg>`);

const defaultIcon = L.icon({
  iconUrl: MARKER_DATA_URL,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -34],
});

L.Marker.prototype.options.icon = defaultIcon;

const PIN_DROP = L.icon({ iconUrl: PIN_RED, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [0, -34] });

const TRUCK_PATH =
  'M8 18h2l1.5-4h9l1.5 4h2v3h-2.5a2 2 0 11-4 0H13a2 2 0 11-4 0H8v-3z';

/** Màu marker theo "kind" của xe. */
function vehicleColor(kind?: string): string {
  if (kind === "vehicle-idle") return "#16a34a"; // xanh lá — sẵn sàng
  if (kind === "vehicle-other") return "#9ca3af"; // xám — bảo trì/hỏng/nghỉ
  return "#2563eb"; // xanh dương — đang chạy
}

/** Marker xe dạng divIcon: cho phép vòng highlight khi chọn + badge %. */
function vehicleDivIcon(mk: MapMarker): L.DivIcon {
  const color = vehicleColor(mk.kind);
  const selected = !!mk.selected;
  const size = selected ? 38 : 30;
  const ring = selected
    ? "box-shadow:0 0 0 5px rgba(37,99,235,.30),0 1px 3px rgba(0,0,0,.4);"
    : "box-shadow:0 1px 3px rgba(0,0,0,.4);";
  const badge = mk.label
    ? `<span style="position:absolute;top:-7px;right:-9px;background:#111827;color:#fff;font-size:9px;font-weight:700;line-height:1;padding:2px 4px;border-radius:9999px;border:1.5px solid #fff;">${mk.label}</span>`
    : "";
  const iconPx = Math.round(size * 0.62);
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      <div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #fff;${ring}display:flex;align-items:center;justify-content:center;">
        <svg width="${iconPx}" height="${iconPx}" viewBox="0 0 32 32"><path d="${TRUCK_PATH}" fill="white"/></svg>
      </div>${badge}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Bong bóng cụm marker (gom cụm thủ công, không cần thư viện). */
function clusterDivIcon(count: number): L.DivIcon {
  const s = count >= 10 ? 46 : 40;
  return L.divIcon({
    className: "",
    html: `<div style="width:${s}px;height:${s}px;border-radius:9999px;background:#1d4ed8;color:#fff;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 1px 5px rgba(0,0,0,.45);">${count}</div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
  });
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  /** Badge nhỏ trên marker (vd "48%"). */
  label?: string;
  popup?: string;
  kind?: "vehicle-busy" | "vehicle-idle" | "vehicle-other" | "pickup" | "dropoff";
  selected?: boolean;
}

export interface MapPolyline {
  id: string;
  points: LatLng[];
  color?: string;
  weight?: number;
  opacity?: number;
  dashed?: boolean;
}

interface Props {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  className?: string;
  /** Bật gom cụm marker khi chồng lấn. */
  cluster?: boolean;
  /** Click vào marker xe → trả về id (thay cho popup). */
  onMarkerClick?: (id: string) => void;
  /** Marker đang chọn → bay tới (flyTo). */
  selectedId?: string | null;
  /** Khi giá trị này đổi → fit khung nhìn vừa khít tất cả marker. */
  fitKey?: string | number;
}

export default function MapCanvas({
  center = { lat: 10.85, lng: 106.7 },
  zoom = 9,
  markers = [],
  polylines = [],
  className,
  cluster = false,
  onMarkerClick,
  selectedId = null,
  fitKey,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{ markers: L.Layer[]; polylines: L.Polyline[] }>({ markers: [], polylines: [] });
  const renderRef = useRef<() => void>(() => {});
  const didFitRef = useRef(false);
  const fitKeyRef = useRef(fitKey);

  // Lọc bỏ toạ độ không hợp lệ trước khi đưa vào Leaflet — marker/điểm xấu bị bỏ qua thay vì làm sập cả app.
  const memoMarkers = useMemo(() => markers.filter((m) => isFiniteLatLng(m.lat, m.lng)), [markers]);
  const memoPolylines = useMemo(
    () => polylines.map((p) => ({ ...p, points: p.points.filter((pt) => isFiniteLatLng(pt.lat, pt.lng)) })),
    [polylines],
  );

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([center.lat, center.lng], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    // Gom cụm lại mỗi khi đổi mức zoom.
    map.on("zoomend", () => renderRef.current());
    return () => {
      map.remove();
      mapRef.current = null;
      didFitRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render markers (với gom cụm tuỳ chọn)
  renderRef.current = () => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.markers.forEach((m) => map.removeLayer(m));
    layersRef.current.markers = [];

    const addSingle = (mk: MapMarker) => {
      const isVehicle = mk.kind?.startsWith("vehicle");
      let layer: L.Marker;
      if (isVehicle) {
        layer = L.marker([mk.lat, mk.lng], { icon: vehicleDivIcon(mk), zIndexOffset: mk.selected ? 1000 : 0 });
        if (onMarkerClick) layer.on("click", () => onMarkerClick(mk.id));
        else if (mk.popup) layer.bindPopup(mk.popup);
      } else {
        const icon = mk.kind === "dropoff" ? PIN_DROP : defaultIcon;
        layer = L.marker([mk.lat, mk.lng], { icon });
        if (mk.popup) layer.bindPopup(mk.popup);
      }
      layer.addTo(map);
      layersRef.current.markers.push(layer);
    };

    if (!cluster) {
      memoMarkers.forEach(addSingle);
      return;
    }

    // Gom cụm theo lưới pixel ở mức zoom hiện tại.
    const z = map.getZoom();
    const cell = 48;
    const groups = new Map<string, MapMarker[]>();
    memoMarkers.forEach((mk) => {
      const pt = map.project([mk.lat, mk.lng] as L.LatLngExpression, z);
      const key = `${Math.floor(pt.x / cell)}_${Math.floor(pt.y / cell)}`;
      const arr = groups.get(key);
      if (arr) arr.push(mk);
      else groups.set(key, [mk]);
    });

    groups.forEach((items) => {
      const hasSelected = items.some((i) => i.id === selectedId);
      if (items.length === 1 || hasSelected) {
        items.forEach(addSingle);
        return;
      }
      const lat = items.reduce((s, i) => s + i.lat, 0) / items.length;
      const lng = items.reduce((s, i) => s + i.lng, 0) / items.length;
      const bubble = L.marker([lat, lng], { icon: clusterDivIcon(items.length) });
      bubble.on("click", () => {
        map.stop();
        try {
          map.flyTo([lat, lng], Math.min((Number.isFinite(z) ? z : 9) + 2, 13));
        } catch {
          map.setView([lat, lng], Math.min((Number.isFinite(z) ? z : 9) + 2, 13));
        }
      });
      bubble.addTo(map);
      layersRef.current.markers.push(bubble);
    });
  };

  useEffect(() => {
    renderRef.current();
  }, [memoMarkers, cluster, selectedId, onMarkerClick]);

  // Polylines
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.polylines.forEach((p) => map.removeLayer(p));
    layersRef.current.polylines = [];
    memoPolylines.forEach((p) => {
      const line = L.polyline(
        p.points.map((pt) => [pt.lat, pt.lng] as [number, number]),
        {
          color: p.color || "#2563eb",
          weight: p.weight ?? 3,
          opacity: p.opacity ?? 0.7,
          dashArray: p.dashed ? "6 8" : undefined,
        }
      );
      line.addTo(map);
      layersRef.current.polylines.push(line);
    });
  }, [memoPolylines]);

  // Bay tới marker đang chọn
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const mk = memoMarkers.find((m) => m.id === selectedId);
    if (!mk || !isFiniteLatLng(mk.lat, mk.lng)) return;
    // getZoom() có thể trả NaN nếu map chưa ổn định → fallback về zoom mặc định.
    const cur = map.getZoom();
    const zoom = Math.max(Number.isFinite(cur) ? cur : 9, 11);
    // Dừng mọi animation đang chạy trước khi flyTo. Gọi flyTo khi flyTo trước CHƯA xong khiến
    // Leaflet tính getCenter() ra NaN giữa chừng và ném "Invalid LatLng (NaN, NaN)" (lỗi đã biết).
    map.stop();
    try {
      map.flyTo([mk.lat, mk.lng], zoom, { duration: 0.6 });
    } catch {
      // Phòng hờ: nếu flyTo vẫn lỗi (state nội bộ hỏng), nhảy thẳng tới vị trí, không animation.
      map.setView([mk.lat, mk.lng], zoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Fit khung nhìn vừa khít tất cả marker — CHỈ lần đầu có marker hoặc khi fitKey đổi.
  // (Không refit mỗi khi số marker thay đổi để khỏi giật khung nhìn khi đang xem.)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || memoMarkers.length === 0) return;
    const fitKeyChanged = fitKeyRef.current !== fitKey;
    if (didFitRef.current && !fitKeyChanged) return;
    fitKeyRef.current = fitKey;
    didFitRef.current = true;
    const bounds = L.latLngBounds(memoMarkers.map((m) => [m.lat, m.lng] as [number, number]));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, memoMarkers.length]);

  return <div ref={containerRef} className={className} style={{ minHeight: 200 }} />;
}
