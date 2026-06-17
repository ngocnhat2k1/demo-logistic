// Kiểu cho Copilot — trợ lý điều hành mô phỏng (intent-matching tất định trên store, KHÔNG LLM thật).
import type { LatLng } from "@/shared/types";
import type { MapMarker, MapPolyline } from "@/shared/map/MapCanvas";

/** Tông màu badge — khớp variant của shared/ui/badge. */
export type StatusTone =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

export interface OrderCardItem {
  id: string;
  code: string;
  customerName: string;
  statusLabel: string;
  statusTone: StatusTone;
  meta?: string;
  href: string;
}

export interface VehicleCardItem {
  id: string;
  plate: string;
  driverName: string;
  statusLabel: string;
  statusTone: StatusTone;
  distanceKm?: number;
  freeKg?: number;
  lat: number;
  lng: number;
}

export interface SuggestionItem {
  vehicleId: string;
  plate: string;
  driverName: string;
  carrierId: string;
  score: number;
  reasons: string[];
}

export interface TimelineItem {
  label: string;
  detail?: string;
  at: string;
  tone?: StatusTone;
}

export interface KpiItem {
  label: string;
  value: string;
  delta?: number;
  deltaDir?: "up" | "down" | "flat";
  /** true (mặc định) = giá trị cao là tốt. */
  good?: boolean;
}

export interface AlertItem {
  severity: "info" | "success" | "warning" | "danger";
  text: string;
  href?: string;
}

export type ResultCard =
  | { kind: "orders"; title?: string; items: OrderCardItem[] }
  | { kind: "vehicles"; title?: string; items: VehicleCardItem[] }
  | { kind: "suggestion"; orderId: string; orderCode: string; weightKg: number; items: SuggestionItem[] }
  | { kind: "timeline"; items: TimelineItem[] }
  | { kind: "kpi"; items: KpiItem[] }
  | { kind: "alerts"; items: AlertItem[] }
  | { kind: "map"; markers: MapMarker[]; polylines?: MapPolyline[]; center?: LatLng; selectedId?: string | null };

export interface CopilotResult {
  sentence: string;
  cards: ResultCard[];
  confidence: number;
  followUps?: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  cards?: ResultCard[];
  confidence?: number;
  followUps?: string[];
  /** true → văn bản đang "gõ dần". */
  streaming?: boolean;
}
