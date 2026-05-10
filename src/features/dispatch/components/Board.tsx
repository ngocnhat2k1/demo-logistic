"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Sparkles, Truck, Package, AlertTriangle, MapPin } from "lucide-react";
import { formatKg } from "@/shared/utils";
import { AISuggestModal } from "./AISuggestModal";
import { AcceptDispatchDialog } from "./AcceptDispatchDialog";
import { MapCanvas } from "@/shared/map";
import type { Driver, Order, Vehicle } from "@/shared/types";
import Link from "next/link";

export function DispatchBoard() {
  const orders = useDataStore((s) => s.orders);
  const vehicles = useDataStore((s) => s.vehicles);
  const drivers = useDataStore((s) => s.drivers);
  const customers = useDataStore((s) => s.customers);
  const user = useAuthStore((s) => s.currentUser);

  const [aiOrder, setAiOrder] = useState<Order | null>(null);
  const [acceptCtx, setAcceptCtx] = useState<{ order: Order; vehicle: Vehicle } | null>(null);

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === "NEW" || o.status === "PENDING_DISPATCH"),
    [orders]
  );
  const availableVehicles = useMemo(() => vehicles.filter((v) => v.status === "AVAILABLE"), [vehicles]);
  const busyVehicles = useMemo(() => vehicles.filter((v) => v.status === "BUSY"), [vehicles]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function onDragEnd(e: DragEndEvent) {
    if (!user) return;
    const orderId = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;
    const vehicleId = String(overId);
    const order = orders.find((o) => o.id === orderId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!order || !vehicle) return;
    // Open the acceptance dialog — actual weight check, quota check, override and assignment happen there.
    setAcceptCtx({ order, vehicle });
  }

  // Map markers: pickup of pending orders + busy vehicles
  const mapMarkers = useMemo(() => {
    const m: { id: string; lat: number; lng: number; popup: string; kind: "vehicle-busy" | "vehicle-idle" | "pickup" | "dropoff" }[] = [];
    busyVehicles.forEach((v) => {
      const driver = drivers.find((d) => d.id === v.currentDriverId);
      m.push({
        id: `v-${v.id}`,
        lat: v.currentLocation.lat,
        lng: v.currentLocation.lng,
        kind: "vehicle-busy",
        popup: `<b>${v.plateNumber}</b><br/>${driver?.fullName ?? ""}<br/>Tốc độ: ${v.speedKmh ?? 40} km/h<br/>Tiến độ: ${Math.round((v.routeProgress ?? 0) * 100)}%`,
      });
    });
    availableVehicles.slice(0, 12).forEach((v) => {
      m.push({
        id: `v-${v.id}`,
        lat: v.currentLocation.lat,
        lng: v.currentLocation.lng,
        kind: "vehicle-idle",
        popup: `<b>${v.plateNumber}</b><br/>Sẵn sàng • ${v.capacityKg.toLocaleString()} kg`,
      });
    });
    return m;
  }, [busyVehicles, availableVehicles, drivers]);

  const mapPolylines = useMemo(
    () =>
      busyVehicles
        .filter((v) => v.routePolyline && v.routePolyline.length > 1)
        .map((v) => ({ id: v.id, points: v.routePolyline! })),
    [busyVehicles]
  );

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
        {/* Pending orders */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <Card className="flex flex-col h-full max-h-[calc(100vh-7rem)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Đơn chờ phân
                </CardTitle>
                <Badge variant="secondary">{pendingOrders.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2 p-3">
              {pendingOrders.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Không có đơn chờ</p>
              )}
              {pendingOrders.map((o) => {
                const c = customers.find((x) => x.id === o.customerId);
                return (
                  <DraggableOrderCard
                    key={o.id}
                    order={o}
                    customerName={c?.name ?? "—"}
                    onSuggest={() => setAiOrder(o)}
                  />
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="lg:col-span-6 min-h-[400px] lg:min-h-0">
          <Card className="h-full max-h-[calc(100vh-7rem)] overflow-hidden">
            <div className="h-full">
              <MapCanvas
                center={{ lat: 10.85, lng: 106.7 }}
                zoom={9}
                markers={mapMarkers}
                polylines={mapPolylines}
                className="h-full w-full"
              />
            </div>
          </Card>
        </div>

        {/* Vehicles */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <Card className="flex flex-col h-full max-h-[calc(100vh-7rem)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Xe
                </CardTitle>
                <Badge variant="secondary">{availableVehicles.length} sẵn sàng</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sẵn sàng</p>
              {availableVehicles.map((v) => (
                <DroppableVehicle key={v.id} vehicle={v} drivers={drivers} />
              ))}
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3">Đang chạy</p>
              {busyVehicles.map((v) => {
                const d = drivers.find((dd) => dd.id === v.currentDriverId);
                return (
                  <div key={v.id} className="rounded-md border bg-muted/50 p-2 text-xs opacity-70">
                    <p className="font-mono font-semibold">{v.plateNumber}</p>
                    <p className="text-muted-foreground">{d?.fullName} • {Math.round((v.routeProgress ?? 0) * 100)}%</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <AISuggestModal order={aiOrder} open={!!aiOrder} onClose={() => setAiOrder(null)} />
      <AcceptDispatchDialog
        order={acceptCtx?.order ?? null}
        vehicle={acceptCtx?.vehicle ?? null}
        onClose={() => setAcceptCtx(null)}
      />
    </DndContext>
  );
}

function DraggableOrderCard({
  order,
  customerName,
  onSuggest,
}: {
  order: Order;
  customerName: string;
  onSuggest: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: order.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-md border bg-card p-2.5 text-xs cursor-grab transition ${
        isDragging ? "shadow-lg" : "hover:border-primary"
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link href={`/orders/${order.id}`} className="font-mono font-semibold text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
            {order.code}
          </Link>
          <p className="font-medium truncate">{customerName}</p>
          <p className="text-muted-foreground truncate text-[10px]">
            <MapPin className="inline h-3 w-3" /> {order.dropoff.address}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {formatKg(order.weightKg)}
        </Badge>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSuggest();
        }}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/20"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Sparkles className="h-3 w-3" /> AI gợi ý xe
      </button>
    </div>
  );
}

function DroppableVehicle({ vehicle, drivers }: { vehicle: Vehicle; drivers: Driver[] }) {
  const { setNodeRef, isOver, active } = useDroppable({ id: vehicle.id });
  const driver = drivers.find((d) => d.id === vehicle.currentDriverId);
  const orders = useDataStore((s) => s.orders);
  const draggingOrder = active ? orders.find((o) => o.id === active.id) : null;
  const wouldOverflow = draggingOrder && draggingOrder.weightKg > vehicle.capacityKg;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-md border p-2 text-xs transition ${
        isOver
          ? wouldOverflow
            ? "border-destructive bg-destructive/10"
            : "border-primary bg-primary/10"
          : "bg-card hover:border-primary/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono font-semibold">{vehicle.plateNumber}</p>
        <Badge variant="success" className="text-[10px]">Sẵn sàng</Badge>
      </div>
      <p className="text-muted-foreground truncate">{driver?.fullName ?? "—"}</p>
      <p className="text-muted-foreground">
        Tải: {formatKg(vehicle.capacityKg)} • {vehicle.type}
      </p>
      {isOver && wouldOverflow && (
        <p className="mt-1 flex items-center gap-1 text-destructive font-medium">
          <AlertTriangle className="h-3 w-3" /> Vượt tải!
        </p>
      )}
    </div>
  );
}
