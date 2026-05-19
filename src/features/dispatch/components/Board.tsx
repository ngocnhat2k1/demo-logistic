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
import {
  Sparkles,
  Truck,
  Package,
  AlertTriangle,
  MapPin,
  Map as MapIcon,
  Hand,
  ChevronRight,
} from "lucide-react";
import { formatKg, cn } from "@/shared/utils";
import { AISuggestModal } from "./AISuggestModal";
import { AcceptDispatchDialog } from "./AcceptDispatchDialog";
import { MobileAssignSheet } from "./MobileAssignSheet";
import { MapCanvas } from "@/shared/map";
import type { Order, Vehicle } from "@/shared/types";
import Link from "next/link";

type MobileTab = "orders" | "map" | "vehicles";

export function DispatchBoard() {
  const orders = useDataStore((s) => s.orders);
  const vehicles = useDataStore((s) => s.vehicles);
  const customers = useDataStore((s) => s.customers);
  const user = useAuthStore((s) => s.currentUser);

  const [aiOrder, setAiOrder] = useState<Order | null>(null);
  const [acceptCtx, setAcceptCtx] = useState<{ order: Order; vehicle: Vehicle } | null>(null);
  const [assignOrder, setAssignOrder] = useState<Order | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("orders");

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === "NEW" || o.status === "PENDING_DISPATCH"),
    [orders],
  );
  const availableVehicles = useMemo(() => vehicles.filter((v) => v.status === "AVAILABLE"), [vehicles]);
  const busyVehicles = useMemo(() => vehicles.filter((v) => v.status === "BUSY"), [vehicles]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(e: DragEndEvent) {
    if (!user) return;
    const orderId = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;
    const vehicleId = String(overId);
    const order = orders.find((o) => o.id === orderId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!order || !vehicle) return;
    setAcceptCtx({ order, vehicle });
  }

  function pickVehicleForMobileAssign(v: Vehicle) {
    if (!assignOrder) return;
    setAcceptCtx({ order: assignOrder, vehicle: v });
    setAssignOrder(null);
  }

  // Map markers
  const mapMarkers = useMemo(() => {
    const m: {
      id: string;
      lat: number;
      lng: number;
      popup: string;
      kind: "vehicle-busy" | "vehicle-idle" | "pickup" | "dropoff";
    }[] = [];
    busyVehicles.forEach((v) => {
      m.push({
        id: `v-${v.id}`,
        lat: v.currentLocation.lat,
        lng: v.currentLocation.lng,
        kind: "vehicle-busy",
        popup: `<b>${v.plateNumber}</b><br/>${v.driverName}<br/>Tốc độ: ${v.speedKmh ?? 40} km/h<br/>Tiến độ: ${Math.round((v.routeProgress ?? 0) * 100)}%`,
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
  }, [busyVehicles, availableVehicles]);

  const mapPolylines = useMemo(
    () =>
      busyVehicles
        .filter((v) => v.routePolyline && v.routePolyline.length > 1)
        .map((v) => ({ id: v.id, points: v.routePolyline! })),
    [busyVehicles],
  );

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      {/* ===== MOBILE: tabs + tap-to-assign ===== */}
      <div className="md:hidden flex flex-col h-full gap-3">
        {/* Hint banner */}
        <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary flex items-start gap-2">
          <Hand className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Chạm vào đơn để chọn xe phân giao</span>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1 shrink-0">
          <TabButton active={mobileTab === "orders"} onClick={() => setMobileTab("orders")}>
            <Package className="h-4 w-4" />
            <span className="text-xs">Đơn</span>
            <Badge variant={mobileTab === "orders" ? "secondary" : "outline"} className="text-[10px] h-4 px-1.5">
              {pendingOrders.length}
            </Badge>
          </TabButton>
          <TabButton active={mobileTab === "map"} onClick={() => setMobileTab("map")}>
            <MapIcon className="h-4 w-4" />
            <span className="text-xs">Bản đồ</span>
          </TabButton>
          <TabButton active={mobileTab === "vehicles"} onClick={() => setMobileTab("vehicles")}>
            <Truck className="h-4 w-4" />
            <span className="text-xs">Xe</span>
            <Badge variant={mobileTab === "vehicles" ? "secondary" : "outline"} className="text-[10px] h-4 px-1.5">
              {availableVehicles.length}
            </Badge>
          </TabButton>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0">
          {mobileTab === "orders" && (
            <Card className="h-full flex flex-col">
              <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
                {pendingOrders.length === 0 && (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    Không có đơn nào chờ phân
                  </div>
                )}
                {pendingOrders.map((o) => (
                  <MobileOrderRow
                    key={o.id}
                    order={o}
                    customerName={customerName(o.customerId)}
                    onAssign={() => setAssignOrder(o)}
                    onSuggest={() => setAiOrder(o)}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {mobileTab === "map" && (
            <Card className="h-full overflow-hidden">
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
          )}

          {mobileTab === "vehicles" && (
            <Card className="h-full flex flex-col">
              <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
                {availableVehicles.length === 0 && busyVehicles.length === 0 && (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    Không có xe nào
                  </div>
                )}
                {availableVehicles.length > 0 && (
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Sẵn sàng ({availableVehicles.length})
                  </p>
                )}
                {availableVehicles.map((v) => (
                  <div key={v.id} className="rounded-md border p-3 text-sm bg-card">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-mono font-semibold">{v.plateNumber}</p>
                      <Badge variant="success" className="text-[10px]">Sẵn sàng</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {v.driverName} • {v.type}
                    </p>
                    <p className="text-xs text-muted-foreground">Tải: {formatKg(v.capacityKg)}</p>
                  </div>
                ))}
                {busyVehicles.length > 0 && (
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3">
                    Đang chạy ({busyVehicles.length})
                  </p>
                )}
                {busyVehicles.map((v) => (
                  <div key={v.id} className="rounded-md border bg-muted/40 p-3 text-sm opacity-80">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-mono font-semibold">{v.plateNumber}</p>
                      <Badge variant="default" className="text-[10px]">
                        {Math.round((v.routeProgress ?? 0) * 100)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{v.driverName}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ===== DESKTOP: 3-col with drag-drop ===== */}
      <div className="hidden md:grid grid-cols-12 gap-4 h-full">
        <div className="col-span-3 flex flex-col min-h-0">
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
              {pendingOrders.map((o) => (
                <DraggableOrderCard
                  key={o.id}
                  order={o}
                  customerName={customerName(o.customerId)}
                  onSuggest={() => setAiOrder(o)}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-6 min-h-0">
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

        <div className="col-span-3 flex flex-col min-h-0">
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
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Sẵn sàng
              </p>
              {availableVehicles.map((v) => (
                <DroppableVehicle key={v.id} vehicle={v} />
              ))}
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3">
                Đang chạy
              </p>
              {busyVehicles.map((v) => (
                <div key={v.id} className="rounded-md border bg-muted/50 p-2 text-xs opacity-70">
                  <p className="font-mono font-semibold">{v.plateNumber}</p>
                  <p className="text-muted-foreground">
                    {v.driverName} • {Math.round((v.routeProgress ?? 0) * 100)}%
                  </p>
                </div>
              ))}
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
      <MobileAssignSheet
        order={assignOrder}
        onClose={() => setAssignOrder(null)}
        onPickVehicle={pickVehicleForMobileAssign}
      />
    </DndContext>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded px-2 py-2 transition",
        active
          ? "bg-background shadow-sm font-semibold"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function MobileOrderRow({
  order,
  customerName,
  onAssign,
  onSuggest,
}: {
  order: Order;
  customerName: string;
  onAssign: () => void;
  onSuggest: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/orders/${order.id}`}
            className="font-mono text-sm font-semibold text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {order.code}
          </Link>
          <p className="font-medium text-sm truncate">{customerName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground flex items-start gap-1">
            <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-destructive" />
            <span className="truncate">{order.dropoff.address}</span>
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {formatKg(order.weightKg)}
        </Badge>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSuggest}
          className="flex-1 flex items-center justify-center gap-1 rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20"
        >
          <Sparkles className="h-3.5 w-3.5" /> AI gợi ý
        </button>
        <button
          onClick={onAssign}
          className="flex-1 flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Phân xe <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
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
          <Link
            href={`/orders/${order.id}`}
            className="font-mono font-semibold text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
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

function DroppableVehicle({ vehicle }: { vehicle: Vehicle }) {
  const { setNodeRef, isOver, active } = useDroppable({ id: vehicle.id });
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
        <Badge variant="success" className="text-[10px]">
          Sẵn sàng
        </Badge>
      </div>
      <p className="text-muted-foreground truncate">{vehicle.driverName}</p>
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
