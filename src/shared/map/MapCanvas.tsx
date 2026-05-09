"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/shared/types";

// Inline marker icon (data URI) to avoid bundler asset issues
const MARKER_DATA_URL =
  "data:image/svg+xml;base64," +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
  <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#2563eb"/>
  <circle cx="12.5" cy="12.5" r="5" fill="white"/>
</svg>`);

const VEHICLE_BUSY_URL =
  "data:image/svg+xml;base64," +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="#2563eb" stroke="white" stroke-width="2"/>
  <path d="M8 18h2l1.5-4h9l1.5 4h2v3h-2.5a2 2 0 11-4 0H13a2 2 0 11-4 0H8v-3z" fill="white"/>
</svg>`);

const VEHICLE_IDLE_URL =
  "data:image/svg+xml;base64," +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="#16a34a" stroke="white" stroke-width="2"/>
  <path d="M8 18h2l1.5-4h9l1.5 4h2v3h-2.5a2 2 0 11-4 0H13a2 2 0 11-4 0H8v-3z" fill="white"/>
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

const VEHICLE_BUSY = L.icon({ iconUrl: VEHICLE_BUSY_URL, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -12] });
const VEHICLE_IDLE = L.icon({ iconUrl: VEHICLE_IDLE_URL, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -12] });
const PIN_DROP = L.icon({ iconUrl: PIN_RED, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [0, -34] });

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  popup?: string;
  kind?: "vehicle-busy" | "vehicle-idle" | "pickup" | "dropoff";
}

export interface MapPolyline {
  id: string;
  points: LatLng[];
  color?: string;
}

interface Props {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  className?: string;
}

export default function MapCanvas({
  center = { lat: 10.85, lng: 106.7 },
  zoom = 9,
  markers = [],
  polylines = [],
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{ markers: L.Marker[]; polylines: L.Polyline[] }>({ markers: [], polylines: [] });

  const memoMarkers = useMemo(() => markers, [markers]);
  const memoPolylines = useMemo(() => polylines, [polylines]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([center.lat, center.lng], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.markers.forEach((m) => map.removeLayer(m));
    layersRef.current.markers = [];
    memoMarkers.forEach((m) => {
      let icon = defaultIcon;
      if (m.kind === "vehicle-busy") icon = VEHICLE_BUSY;
      else if (m.kind === "vehicle-idle") icon = VEHICLE_IDLE;
      else if (m.kind === "dropoff") icon = PIN_DROP;
      const marker = L.marker([m.lat, m.lng], { icon });
      if (m.popup) marker.bindPopup(m.popup);
      marker.addTo(map);
      layersRef.current.markers.push(marker);
    });
  }, [memoMarkers]);

  // Update polylines
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.polylines.forEach((p) => map.removeLayer(p));
    layersRef.current.polylines = [];
    memoPolylines.forEach((p) => {
      const line = L.polyline(
        p.points.map((pt) => [pt.lat, pt.lng] as [number, number]),
        { color: p.color || "#2563eb", weight: 3, opacity: 0.7 }
      );
      line.addTo(map);
      layersRef.current.polylines.push(line);
    });
  }, [memoPolylines]);

  return <div ref={containerRef} className={className} style={{ minHeight: 200 }} />;
}
