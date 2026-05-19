"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { MapCanvas } from "@/shared/map";
import type { MapMarker, MapPolyline } from "@/shared/map/MapCanvas";
import { useDataStore } from "@/shared/stores/data";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import { Gauge, Clock, MapPinned } from "lucide-react";
import type { LatLng, Order } from "@/shared/types";
import { cn } from "@/shared/utils";

interface OrderRouteMapProps {
  order: Order;
  heightClass?: string;
  showInfoBar?: boolean;
}

export function OrderRouteMap({
  order,
  heightClass = "h-[320px] md:h-[400px]",
  showInfoBar = true,
}: OrderRouteMapProps) {
  const vehicles = useDataStore((s) => s.vehicles);
  const drivers = useDataStore((s) => s.drivers);

  const asg = order.assignments[0];
  const vehicle = asg ? vehicles.find((v) => v.id === asg.vehicleId) : undefined;
  const driver = asg ? drivers.find((d) => d.id === asg.driverId) : undefined;

  const isAssigned = !!asg;
  const isDelivered = order.status === "DELIVERED";
  const isFailed =
    order.status === "DELIVERY_FAILED" ||
    order.status === "RETURNING_TO_WAREHOUSE" ||
    order.status === "RETURNED";

  const polylineColor = isFailed
    ? "#dc2626"
    : isDelivered
    ? "#16a34a"
    : isAssigned
    ? "#2563eb"
    : "#94a3b8";

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [
      {
        id: `pickup-${order.id}`,
        lat: order.pickup.lat,
        lng: order.pickup.lng,
        kind: "pickup",
        popup: `<b>Điểm lấy</b><br/>${escapeHtml(order.pickup.address)}${
          order.pickup.contactName ? `<br/>${escapeHtml(order.pickup.contactName)}` : ""
        }`,
      },
      {
        id: `dropoff-${order.id}`,
        lat: order.dropoff.lat,
        lng: order.dropoff.lng,
        kind: "dropoff",
        popup: `<b>Điểm giao</b><br/>${escapeHtml(order.dropoff.address)}${
          order.dropoff.contactName ? `<br/>${escapeHtml(order.dropoff.contactName)}` : ""
        }`,
      },
    ];

    if (vehicle && vehicle.currentLocation) {
      const pct = Math.round((vehicle.routeProgress ?? 0) * 100);
      list.push({
        id: `vehicle-${vehicle.id}`,
        lat: vehicle.currentLocation.lat,
        lng: vehicle.currentLocation.lng,
        kind: vehicle.status === "BUSY" ? "vehicle-busy" : "vehicle-idle",
        popup: `<b>${escapeHtml(vehicle.plateNumber)}</b><br/>${escapeHtml(
          driver?.fullName ?? "—",
        )}<br/>Tốc độ: ${vehicle.speedKmh ?? 0} km/h<br/>Tiến độ: ${pct}%`,
      });
    }

    return list;
  }, [order.id, order.pickup, order.dropoff, vehicle, driver]);

  const polylines = useMemo<MapPolyline[]>(() => {
    const points: LatLng[] =
      vehicle?.routePolyline && vehicle.routePolyline.length > 1
        ? vehicle.routePolyline
        : [
            { lat: order.pickup.lat, lng: order.pickup.lng },
            { lat: order.dropoff.lat, lng: order.dropoff.lng },
          ];
    return [{ id: `route-${order.id}`, points, color: polylineColor }];
  }, [order.id, order.pickup, order.dropoff, vehicle?.routePolyline, polylineColor]);

  const center = useMemo(() => {
    const pts: LatLng[] = [
      { lat: order.pickup.lat, lng: order.pickup.lng },
      { lat: order.dropoff.lat, lng: order.dropoff.lng },
    ];
    if (vehicle?.currentLocation) pts.push(vehicle.currentLocation);
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    return { lat, lng };
    // Only recompute when assignment presence changes, not on every tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, order.assignments.length]);

  const zoom = isAssigned ? 11 : 10;
  const progressPct = Math.round((vehicle?.routeProgress ?? 0) * 100);

  return (
    <div className="space-y-3">
      {showInfoBar && (
        <InfoBar
          order={order}
          vehiclePlate={vehicle?.plateNumber}
          driverName={driver?.fullName}
          progressPct={progressPct}
          speedKmh={vehicle?.speedKmh}
          lastGpsUpdate={vehicle?.lastGpsUpdate}
          isAssigned={isAssigned}
          isDelivered={isDelivered}
        />
      )}
      <div className={cn("overflow-hidden rounded-md border", heightClass)}>
        <MapCanvas
          center={center}
          zoom={zoom}
          markers={markers}
          polylines={polylines}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}

function InfoBar({
  order,
  vehiclePlate,
  driverName,
  progressPct,
  speedKmh,
  lastGpsUpdate,
  isAssigned,
  isDelivered,
}: {
  order: Order;
  vehiclePlate?: string;
  driverName?: string;
  progressPct: number;
  speedKmh?: number;
  lastGpsUpdate?: string;
  isAssigned: boolean;
  isDelivered: boolean;
}) {
  if (!isAssigned) {
    return (
      <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground flex items-center gap-2">
        <MapPinned className="h-4 w-4" />
        Chưa phân xe — chưa có dữ liệu hành trình
      </div>
    );
  }

  if (isDelivered) {
    return (
      <div className="rounded-md border bg-success/5 p-3 text-sm flex items-center gap-2">
        <MapPinned className="h-4 w-4 text-success" />
        <span>
          Đã giao lúc{" "}
          <span className="font-medium">
            {order.deliveredAt
              ? format(new Date(order.deliveredAt), "HH:mm dd/MM", { locale: vi })
              : "—"}
          </span>
          {vehiclePlate && (
            <>
              {" • "}Xe <span className="font-mono font-medium">{vehiclePlate}</span>
              {driverName && <> • {driverName}</>}
            </>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {vehiclePlate && (
          <Badge variant="secondary" className="font-mono">
            {vehiclePlate}
          </Badge>
        )}
        {driverName && <span className="text-muted-foreground">{driverName}</span>}
        <span className="ml-auto flex items-center gap-1 text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" /> {speedKmh ?? 0} km/h
        </span>
        {lastGpsUpdate && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(lastGpsUpdate), "HH:mm:ss", { locale: vi })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Progress value={progressPct} className="h-2 flex-1" />
        <span className="text-xs font-medium tabular-nums w-10 text-right">{progressPct}%</span>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
