"use client";

import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { Card, CardContent } from "@/shared/ui/card";
import { StatusBadge } from "@/features/orders/components/StatusBadge";
import Link from "next/link";
import { formatKg } from "@/shared/utils";
import { PendingAssignmentCard } from "@/features/driver/components/PendingAssignmentCard";

export default function DriverOrdersPage() {
  const user = useAuthStore((s) => s.currentUser);
  const orders = useDataStore((s) => s.orders);
  const customers = useDataStore((s) => s.customers);
  const myVehicleId = user?.vehicleId;

  const myOrders = orders.filter((o) =>
    o.assignments.some((a) => a.vehicleId === myVehicleId)
  );

  const pendingAssignments = myOrders.flatMap((o) => {
    const a = o.assignments.find(
      (x) => x.vehicleId === myVehicleId && x.status === "PENDING_ACCEPT"
    );
    return a ? [{ order: o, assignment: a }] : [];
  });

  const otherOrders = myOrders.filter((o) => o.status !== "PENDING_ACCEPT");

  return (
    <div className="p-4 space-y-4">
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

      <div>
        <h2 className="text-lg font-semibold mb-2">Tất cả đơn của tôi ({otherOrders.length})</h2>
        {otherOrders.map((o) => {
          const c = customers.find((cc) => cc.id === o.customerId);
          return (
            <Link key={o.id} href={`/driver/orders/${o.id}`}>
              <Card className="hover:border-primary mb-2">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-mono font-semibold">{o.code}</p>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="font-medium">{c?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">→ {o.dropoff.address}</p>
                  <p className="text-xs mt-1">{formatKg(o.weightKg)}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
