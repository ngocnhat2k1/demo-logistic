"use client";

import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { Card, CardContent } from "@/shared/ui/card";
import { StatusBadge } from "@/features/orders/components/StatusBadge";
import { Package, MapPin, Truck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatKg } from "@/shared/utils";

export default function DriverHomePage() {
  const user = useAuthStore((s) => s.currentUser);
  const orders = useDataStore((s) => s.orders);
  const customers = useDataStore((s) => s.customers);
  const vehicles = useDataStore((s) => s.vehicles);

  const myDriverId = user?.driverId;
  const myOrders = orders
    .filter((o) =>
      o.assignments.some((a) => a.driverId === myDriverId) &&
      !["DELIVERED", "CANCELLED", "RETURNED", "CANCELLED_AFTER_RETURN"].includes(o.status)
    )
    .sort((a, b) => new Date(b.assignments[0]?.assignedAt ?? b.createdAt).getTime() - new Date(a.assignments[0]?.assignedAt ?? a.createdAt).getTime());

  const myVehicle = vehicles.find((v) => v.currentDriverId === myDriverId);

  return (
    <div className="p-4 space-y-4">
      <Card className="bg-primary text-primary-foreground border-0">
        <CardContent className="p-4 flex items-center gap-3">
          <Truck className="h-8 w-8" />
          <div>
            <p className="text-xs opacity-80">Xe của bạn</p>
            <p className="text-xl font-bold font-mono">{myVehicle?.plateNumber ?? "Chưa có xe"}</p>
            {myVehicle && <p className="text-xs opacity-80">{formatKg(myVehicle.capacityKg)} • {myVehicle.type}</p>}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-2">Đơn cần giao ({myOrders.length})</h2>
        {myOrders.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Hiện chưa có đơn nào được phân</p>
              <p className="text-xs mt-1">Vui lòng đợi điều độ phân xe</p>
            </CardContent>
          </Card>
        )}
        {myOrders.map((o) => {
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
                    <p className="flex items-start gap-1.5"><MapPin className="h-4 w-4 shrink-0 mt-0.5 text-success" /><span className="flex-1">{o.pickup.address}</span></p>
                    <p className="flex items-start gap-1.5"><MapPin className="h-4 w-4 shrink-0 mt-0.5 text-destructive" /><span className="flex-1">{o.dropoff.address}</span></p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">{formatKg(o.weightKg)}</span>
                    <span className="flex items-center gap-1 text-primary text-sm font-medium">Mở đơn <ArrowRight className="h-4 w-4" /></span>
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
