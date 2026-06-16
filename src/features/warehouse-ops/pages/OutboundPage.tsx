"use client";

import { useMemo, useState } from "react";
import { Search, PackageMinus, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { useDataStore } from "@/shared/stores/data";
import { useScopedOrders } from "@/shared/hooks/useScopedData";
import { formatKg } from "@/shared/utils";
import { ORDER_STATUS_LABEL } from "@/features/orders/domain/orderStatus";
import { OutboundDialog } from "@/features/warehouse-ops/components/OutboundDialog";
import type { Order } from "@/shared/types";

export default function OutboundPage() {
  const orders = useScopedOrders();
  const customers = useDataStore((s) => s.customers);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Order | null>(null);

  const ready = useMemo(
    () =>
      orders.filter(
        (o) => o.status === "DISPATCHED" || o.status === "PICKED_UP"
      ),
    [orders]
  );

  const filtered = ready.filter((o) => {
    const t = q.toLowerCase().trim();
    if (!t) return true;
    const c = customers.find((cc) => cc.id === o.customerId);
    return (
      o.code.toLowerCase().includes(t) ||
      (c?.name.toLowerCase().includes(t) ?? false) ||
      o.dropoff.address.toLowerCase().includes(t)
    );
  });

  return (
    <>
      <Topbar title="Xuất kho" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo mã đơn, khách hàng, điểm giao..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span> đơn sẵn sàng xuất
            (đã phân xe / đã lấy hàng)
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Đơn</th>
                    <th className="px-4 py-3 font-medium">Khách hàng</th>
                    <th className="px-4 py-3 font-medium">Điểm giao</th>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Khối lượng</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        Không có đơn cần xuất kho
                      </td>
                    </tr>
                  )}
                  {filtered.map((o) => {
                    const c = customers.find((cc) => cc.id === o.customerId);
                    const itemCount = o.items?.length ?? 0;
                    const outboundDone = o.events.some((e) => e.type === "STOCK_OUTBOUND");
                    return (
                      <tr key={o.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/orders/${o.id}`} className="font-mono text-primary hover:underline">
                            {o.code}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{c?.name ?? "—"}</td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="truncate block text-muted-foreground">{o.dropoff.address}</span>
                        </td>
                        <td className="px-4 py-3">
                          {itemCount > 0 ? `${itemCount} mã` : <span className="text-destructive text-xs">Chưa có SKU</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatKg(o.actualWeightKg ?? o.weightKg)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={o.status === "PICKED_UP" ? "default" : "secondary"}>
                            {ORDER_STATUS_LABEL[o.status]}
                          </Badge>
                        </td>
                        <td className="px-2 py-3 text-right">
                          {outboundDone ? (
                            <span className="inline-flex items-center gap-1 text-xs text-success">
                              <CheckCircle2 className="h-4 w-4" /> Đã xuất
                            </span>
                          ) : (
                            <Button size="sm" onClick={() => setActive(o)} disabled={itemCount === 0}>
                              <PackageMinus className="h-4 w-4" /> Xuất kho
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <OutboundDialog
        open={!!active}
        order={active}
        onOpenChange={(v) => {
          if (!v) setActive(null);
        }}
      />
    </>
  );
}
