"use client";

import { useDataStore } from "@/lib/stores/data";
import { useAuthStore } from "@/lib/stores/auth";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/orders/StatusBadge";
import Link from "next/link";
import { formatKg } from "@/lib/utils";

export default function DriverOrdersList() {
  const user = useAuthStore((s) => s.currentUser);
  const orders = useDataStore((s) => s.orders);
  const customers = useDataStore((s) => s.customers);
  const myDriverId = user?.driverId;

  const myOrders = orders.filter((o) => o.assignments.some((a) => a.driverId === myDriverId));

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Tất cả đơn của tôi ({myOrders.length})</h2>
      {myOrders.map((o) => {
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
  );
}
