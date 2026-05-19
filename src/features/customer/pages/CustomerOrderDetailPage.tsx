"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, CalendarClock, FileCheck2, MapPin, Package, PenLine, Pencil, Route, Truck, UserRound } from "lucide-react";
import { StatusBadge } from "@/features/orders/components/StatusBadge";
import { ORDER_STATUS_LABEL, canEdit } from "@/features/orders/domain/orderStatus";
import { EditOrderInfoDialog } from "@/features/orders/components/EditOrderInfoDialog";
import { useAuthStore } from "@/features/auth/stores/auth";
import { useDataStore } from "@/shared/stores/data";
import { MapCanvas } from "@/shared/map";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { formatKg } from "@/shared/utils";
import type { MapMarker, MapPolyline } from "@/shared/map/MapCanvas";
import type { Order, OrderEvent, OrderStatus } from "@/shared/types";

export default function CustomerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.currentUser);
  const customer = useDataStore((s) => s.customers.find((c) => c.id === user?.customerId));
  const order = useDataStore((s) => s.orders.find((o) => o.id === id));
  const vehicles = useDataStore((s) => s.vehicles);
  const [editOpen, setEditOpen] = useState(false);

  if (!customer || !order || order.customerId !== customer.id) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/customer">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Không tìm thấy đơn hàng hoặc tài khoản này không có quyền xem đơn.
          </CardContent>
        </Card>
      </div>
    );
  }

  const assignment = order.assignments[0];
  const vehicle = assignment ? vehicles.find((v) => v.id === assignment.vehicleId) : undefined;
  const driverName = vehicle?.driverName;
  const progress = estimateProgress(order, vehicle?.routeProgress);
  const markers: MapMarker[] = [
    {
      id: "pickup",
      lat: order.pickup.lat,
      lng: order.pickup.lng,
      popup: `Lấy hàng: ${order.pickup.address}`,
      kind: "pickup",
    },
    {
      id: "dropoff",
      lat: order.dropoff.lat,
      lng: order.dropoff.lng,
      popup: `Giao hàng: ${order.dropoff.address}`,
      kind: "dropoff",
    },
  ];
  if (vehicle) {
    markers.push({
      id: vehicle.id,
      lat: vehicle.currentLocation.lat,
      lng: vehicle.currentLocation.lng,
      popup: `${vehicle.plateNumber} • ${driverName ?? "Tài xế"}`,
      kind: vehicle.status === "BUSY" ? "vehicle-busy" : "vehicle-idle",
    });
  }
  const polylines: MapPolyline[] = [
    {
      id: order.id,
      points: vehicle?.routePolyline && vehicle.routePolyline.length > 1 ? vehicle.routePolyline : [order.pickup, order.dropoff],
      color: "#0f766e",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/customer">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{customer.code}</Badge>
          <StatusBadge status={order.status} />
          {canEdit(order.status) && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Sửa thông tin
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="font-mono text-xl">{order.code}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{order.description}</p>
            </div>
            <div className="text-sm md:text-right">
              <p className="font-semibold">{ORDER_STATUS_LABEL[order.status]}</p>
              <p className="text-muted-foreground">Cập nhật {formatDate(order.updatedAt)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-md border">
            <MapCanvas
              center={vehicle?.currentLocation ?? order.pickup}
              zoom={10}
              markers={markers}
              polylines={polylines}
              className="h-[360px] w-full"
            />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tiến độ tuyến</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile icon={<Package className="h-4 w-4" />} label="Khối lượng" value={formatKg(order.weightKg)} />
              <InfoTile icon={<CalendarClock className="h-4 w-4" />} label="Hẹn giao" value={formatDate(order.requestedDeliveryAt)} />
              <InfoTile icon={<Truck className="h-4 w-4" />} label="Xe" value={vehicle?.plateNumber ?? "Chưa phân xe"} />
              <InfoTile icon={<UserRound className="h-4 w-4" />} label="Tài xế" value={driverName ?? "Chưa có"} />
            </div>
            <RouteBox label="Điểm lấy" address={order.pickup.address} contact={contactLine(order.pickup.contactName, order.pickup.contactPhone)} />
            <RouteBox label="Điểm giao" address={order.dropoff.address} contact={contactLine(order.dropoff.contactName, order.dropoff.contactPhone)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Route className="h-4 w-4" /> Lịch sử trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative ml-3 space-y-4 border-l-2 border-muted">
              {publicEvents(order.events).map((event) => (
                <li key={event.id} className="ml-4">
                  <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-primary" />
                  <p className="text-sm font-medium">{eventLabel(event)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(event.at, "dd/MM/yyyy HH:mm")}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck2 className="h-4 w-4" /> Chứng từ giao hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(order.deliveryEvidence?.length ?? 0) === 0 && !order.signature && (
              <p className="text-sm text-muted-foreground">Chưa có POD hoặc chữ ký bàn giao.</p>
            )}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {order.deliveryEvidence?.map((src, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={index} src={src} alt="POD" className="aspect-square rounded-md border bg-white object-cover" />
              ))}
              {order.signature && (
                <div className="col-span-2 rounded-md border bg-white p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <PenLine className="h-3.5 w-3.5" /> Chữ ký người nhận
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.signature} alt="Chữ ký người nhận" className="h-32 w-full object-contain" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <EditOrderInfoDialog order={order} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function RouteBox({ label, address, contact }: { label: string; address: string; contact?: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{address}</p>
      {contact && <p className="mt-1 text-xs text-muted-foreground">{contact}</p>}
    </div>
  );
}

function publicEvents(events: OrderEvent[]) {
  return events.filter((event) =>
    ["CREATED", "DISPATCHED", "STATUS_CHANGE", "DELIVERED", "DELIVERY_FAILED", "SPLIT_FROM"].includes(event.type)
  );
}

function eventLabel(event: OrderEvent) {
  if (event.type === "CREATED") return "Đơn hàng được tạo";
  if (event.type === "DISPATCHED") return "Đơn đã được phân xe";
  if (event.type === "DELIVERED") return "Giao hàng thành công";
  if (event.type === "DELIVERY_FAILED") return "Giao hàng chưa thành công";
  if (event.type === "SPLIT_FROM") return "Đơn được tách tuyến xử lý";
  if (event.type === "STATUS_CHANGE") {
    const to = event.payload.to;
    if (typeof to === "string" && isOrderStatus(to)) return `Cập nhật: ${ORDER_STATUS_LABEL[to]}`;
  }
  return "Cập nhật đơn hàng";
}

function estimateProgress(order: Order, routeProgress?: number) {
  if (routeProgress !== undefined) return Math.round(Math.max(0, Math.min(1, routeProgress)) * 100);
  switch (order.status) {
    case "NEW":
      return 5;
    case "PENDING_DISPATCH":
      return 10;
    case "DISPATCHED":
      return 25;
    case "PICKED_UP":
      return 45;
    case "IN_TRANSIT":
      return 70;
    case "DELIVERED":
    case "RETURNED":
      return 100;
    case "DELIVERY_FAILED":
    case "RETURN_PROCESSING":
    case "RETURNING_TO_WAREHOUSE":
      return 80;
    default:
      return 0;
  }
}

function isOrderStatus(value: string): value is OrderStatus {
  return value in ORDER_STATUS_LABEL;
}

function contactLine(name?: string, phone?: string) {
  if (name && phone) return `${name} • ${phone}`;
  return name ?? phone;
}

function formatDate(value: string, pattern = "dd/MM HH:mm") {
  return format(new Date(value), pattern, { locale: vi });
}
