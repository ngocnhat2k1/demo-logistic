"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Truck, Phone, X, Crosshair, Package, MapPin } from "lucide-react";

import { useDataStore } from "@/shared/stores/data";
import { MapCanvas } from "@/shared/map";
import type { MapMarker, MapPolyline } from "@/shared/map/MapCanvas";
import { formatKg, cn } from "@/shared/utils";
import type { Vehicle } from "@/shared/types";

type StatusKey = "busy" | "available" | "other";

const ACTIVE_ASSIGN = ["PENDING_ACCEPT", "ASSIGNED", "PICKED_UP", "IN_TRANSIT"];

function statusKeyOf(v: Vehicle): StatusKey {
  if (v.status === "BUSY") return "busy";
  if (v.status === "AVAILABLE") return "available";
  return "other";
}

interface Props {
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string | null) => void;
  className?: string;
}

/**
 * Bản đồ giám sát đội xe: mặc định chỉ hiện vị trí xe (gom cụm khi chồng lấn).
 * Chọn 1 xe → bay tới + vẽ route của riêng nó + mở panel chi tiết.
 */
export function FleetMapPanel({ selectedVehicleId, onSelectVehicle, className }: Props) {
  const vehicles = useDataStore((s) => s.vehicles);
  const orders = useDataStore((s) => s.orders);
  const customers = useDataStore((s) => s.customers);

  const [visible, setVisible] = useState<Record<StatusKey, boolean>>({
    busy: true,
    available: true,
    other: true,
  });
  const [fitKey, setFitKey] = useState(0);

  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = { busy: 0, available: 0, other: 0 };
    vehicles.forEach((v) => (c[statusKeyOf(v)] += 1));
    return c;
  }, [vehicles]);

  const selected = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  // Đơn đang gắn với xe được chọn (qua activeAssignmentId).
  const selectedOrder = useMemo(() => {
    if (!selected) return null;
    return (
      orders.find((o) =>
        o.assignments.some(
          (a) =>
            (selected.activeAssignmentId && a.id === selected.activeAssignmentId) ||
            (a.vehicleId === selected.id && ACTIVE_ASSIGN.includes(a.status)),
        ),
      ) ?? null
    );
  }, [selected, orders]);

  const markers = useMemo<MapMarker[]>(() => {
    const m: MapMarker[] = [];
    vehicles.forEach((v) => {
      const key = statusKeyOf(v);
      if (!visible[key]) return;
      const kind =
        key === "busy" ? "vehicle-busy" : key === "available" ? "vehicle-idle" : "vehicle-other";
      m.push({
        id: `v-${v.id}`,
        lat: v.currentLocation.lat,
        lng: v.currentLocation.lng,
        kind,
        selected: v.id === selectedVehicleId,
        label: key === "busy" ? `${Math.round((v.routeProgress ?? 0) * 100)}%` : undefined,
      });
    });
    // Điểm giao của xe đang chọn (pin đỏ).
    if (selected && selectedOrder) {
      m.push({
        id: `drop-${selectedOrder.id}`,
        lat: selectedOrder.dropoff.lat,
        lng: selectedOrder.dropoff.lng,
        kind: "dropoff",
        popup: `<b>Điểm giao</b><br/>${selectedOrder.dropoff.address}`,
      });
    }
    return m;
  }, [vehicles, visible, selectedVehicleId, selected, selectedOrder]);

  // Chỉ vẽ route của xe đang chọn.
  const polylines = useMemo<MapPolyline[]>(() => {
    if (!selected?.routePolyline || selected.routePolyline.length < 2) return [];
    return [{ id: selected.id, points: selected.routePolyline, color: "#2563eb", weight: 5, opacity: 0.9 }];
  }, [selected]);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";

  const chips: { key: StatusKey; label: string; dot: string }[] = [
    { key: "busy", label: "Đang chạy", dot: "bg-blue-500" },
    { key: "available", label: "Sẵn sàng", dot: "bg-emerald-500" },
    { key: "other", label: "Khác", dot: "bg-gray-400" },
  ];

  function handleMarkerClick(markerId: string) {
    if (markerId.startsWith("v-")) onSelectVehicle(markerId.slice(2));
  }

  function resetView() {
    onSelectVehicle(null);
    setFitKey((k) => k + 1);
  }

  return (
    <div className={cn("relative", className)}>
      <MapCanvas
        cluster
        markers={markers}
        polylines={polylines}
        selectedId={selectedVehicleId ? `v-${selectedVehicleId}` : null}
        onMarkerClick={handleMarkerClick}
        fitKey={fitKey}
        className="h-full w-full"
      />

      {/* Chú thích + bộ lọc trạng thái */}
      <div className="pointer-events-auto absolute left-3 top-3 flex flex-col gap-1.5 text-[11px]">
        {chips
          .filter((c) => counts[c.key] > 0)
          .map((c) => (
            <button
              key={c.key}
              onClick={() => setVisible((v) => ({ ...v, [c.key]: !v[c.key] }))}
              className={cn(
                "flex items-center gap-2 rounded-md border bg-background/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm transition",
                visible[c.key] ? "" : "opacity-45 grayscale",
              )}
              title={visible[c.key] ? "Ẩn nhóm này" : "Hiện nhóm này"}
            >
              <span className={cn("h-2 w-2 rounded-full", c.dot)} />
              <span className="text-muted-foreground">{c.label}</span>
              <span className="font-semibold tabular-nums">{counts[c.key]}</span>
            </button>
          ))}
      </div>

      {/* Nút xem toàn cảnh */}
      <button
        onClick={resetView}
        className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md border bg-background/90 px-2.5 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur-sm hover:bg-background"
        title="Bỏ chọn & xem tất cả xe"
      >
        <Crosshair className="h-3.5 w-3.5" /> Xem tất cả
      </button>

      {/* Panel chi tiết xe đang chọn */}
      {selected && (
        <div className="absolute bottom-3 left-3 right-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-sm sm:right-auto sm:w-72">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-mono text-sm font-bold">
                <Truck className="h-4 w-4 text-primary" /> {selected.plateNumber}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {selected.driverName} • {selected.type}
              </p>
            </div>
            <button
              onClick={() => onSelectVehicle(null)}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border bg-muted/40 px-2 py-1.5">
              <p className="text-[10px] text-muted-foreground">Trạng thái</p>
              <p className="font-medium">
                {selected.status === "BUSY"
                  ? `Đang chạy • ${Math.round((selected.routeProgress ?? 0) * 100)}%`
                  : selected.status === "AVAILABLE"
                    ? "Sẵn sàng"
                    : selected.status}
              </p>
            </div>
            <div className="rounded-md border bg-muted/40 px-2 py-1.5">
              <p className="text-[10px] text-muted-foreground">Tải trọng</p>
              <p className="font-medium">{formatKg(selected.capacityKg)}</p>
            </div>
          </div>

          {selectedOrder && (
            <div className="mt-2 rounded-md border bg-primary/5 px-2 py-1.5 text-xs">
              <Link
                href={`/orders/${selectedOrder.id}`}
                className="font-mono font-semibold text-primary hover:underline"
              >
                <Package className="mr-1 inline h-3 w-3" />
                {selectedOrder.code}
              </Link>
              <span className="ml-1 text-muted-foreground">• {customerName(selectedOrder.customerId)}</span>
              <p className="mt-0.5 flex items-start gap-1 text-[11px] text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                <span className="line-clamp-2">{selectedOrder.dropoff.address}</span>
              </p>
            </div>
          )}

          <a
            href={`tel:${selected.driverPhone}`}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Phone className="h-3.5 w-3.5" /> Gọi tài xế
          </a>
        </div>
      )}
    </div>
  );
}
