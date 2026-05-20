"use client";

import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { StatusBadge } from "@/features/orders/components/StatusBadge";
import { Package, MapPin, Truck, ArrowRight, Gauge, AlertTriangle, Wrench, Info } from "lucide-react";
import Link from "next/link";
import { formatKg } from "@/shared/utils";
import { formatKm, getMaintenanceInfo } from "@/features/fleet/utils";
import { PendingAssignmentCard } from "@/features/driver/components/PendingAssignmentCard";
import { OdometerUpdateDialog } from "@/features/driver/components/OdometerUpdateDialog";

export default function DriverHomePage() {
  const user = useAuthStore((s) => s.currentUser);
  const orders = useDataStore((s) => s.orders);
  const customers = useDataStore((s) => s.customers);
  const vehicles = useDataStore((s) => s.vehicles);

  const myVehicleId = user?.vehicleId;
  const myVehicle = vehicles.find((v) => v.id === myVehicleId);
  const maint = myVehicle ? getMaintenanceInfo(myVehicle) : null;

  const myOrders = orders
    .filter(
      (o) =>
        o.assignments.some((a) => a.vehicleId === myVehicleId) &&
        !["DELIVERED", "CANCELLED", "RETURNED", "CANCELLED_AFTER_RETURN"].includes(o.status)
    )
    .sort(
      (a, b) =>
        new Date(b.assignments[0]?.assignedAt ?? b.createdAt).getTime() -
        new Date(a.assignments[0]?.assignedAt ?? a.createdAt).getTime()
    );

  const pendingAssignments = myOrders.flatMap((o) => {
    const a = o.assignments.find(
      (x) => x.vehicleId === myVehicleId && x.status === "PENDING_ACCEPT"
    );
    return a ? [{ order: o, assignment: a }] : [];
  });

  const activeOrders = myOrders.filter((o) => o.status !== "PENDING_ACCEPT");

  return (
    <div className="p-4 space-y-4">
      <Card className="bg-primary text-primary-foreground border-0">
        <CardContent className="p-4 flex items-center gap-3">
          <Truck className="h-8 w-8" />
          <div className="flex-1 min-w-0">
            <p className="text-xs opacity-80">Xe của bạn</p>
            <p className="text-xl font-bold font-mono">{myVehicle?.plateNumber ?? "Chưa có xe"}</p>
            {myVehicle && (
              <p className="text-xs opacity-80">
                {formatKg(myVehicle.capacityKg)} • {myVehicle.type} • Bằng{" "}
                {myVehicle.driverLicenseClass}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {myVehicle && maint && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Gauge className="h-4 w-4" /> Số km xe
              </p>
              {maint.state === "overdue" ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Quá hạn bảo trì
                </Badge>
              ) : maint.state === "due_soon" ? (
                <Badge variant="warning" className="gap-1">
                  <Wrench className="h-3 w-3" /> Sắp bảo trì
                </Badge>
              ) : (
                <Badge variant="success">Ổn</Badge>
              )}
            </div>
            <p className="text-2xl font-bold font-mono">{formatKm(myVehicle.odometerKm)}</p>
            <p className="text-xs text-muted-foreground">
              Từ lần BT cuối: {formatKm(maint.kmSinceMaintenance)} /{" "}
              {formatKm(myVehicle.maintenanceIntervalKm)}
              {maint.state !== "overdue" && (
                <> • Còn {formatKm(maint.kmUntilNext)} đến hạn BT</>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground italic">
              Số km tự động cập nhật sau mỗi đơn — hoặc bấm bên dưới để cập nhật thủ công.
            </p>
            <OdometerUpdateDialog vehicle={myVehicle} />
          </CardContent>
        </Card>
      )}

      {pendingAssignments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">
            Đơn chờ xác nhận ({pendingAssignments.length})
          </h2>
          <div className="space-y-3">
            {pendingAssignments.map(({ order, assignment }) => (
              <PendingAssignmentCard key={assignment.id} order={order} assignment={assignment} />
            ))}
          </div>
        </div>
      )}

      {activeOrders.length > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Mỗi tài xế chỉ xử lý 1 đơn cùng lúc. Hoàn tất đơn hiện tại trước khi nhận thêm.</span>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2">Đơn đang giao ({activeOrders.length})</h2>
        {activeOrders.length === 0 && pendingAssignments.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Hiện chưa có đơn nào được phân</p>
              <p className="text-xs mt-1">Vui lòng đợi điều độ phân xe</p>
            </CardContent>
          </Card>
        )}
        {activeOrders.map((o) => {
          const c = customers.find((cc) => cc.id === o.customerId);
          return (
            <Link key={o.id} href={`/driver/orders/${o.id}`} className="block mb-3">
              <Card className="hover:border-primary transition">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-mono font-semibold text-primary">{o.code}</p>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="font-semibold text-base">{c?.name ?? "—"}</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="flex items-start gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-success" />
                      <span className="flex-1">{o.pickup.address}</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                      <span className="flex-1">{o.dropoff.address}</span>
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">{formatKg(o.weightKg)}</span>
                    <span className="flex items-center gap-1 text-primary text-sm font-medium">
                      Mở đơn <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
