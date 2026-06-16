"use client";

import { useState } from "react";
import { PackagePlus, Undo2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { useDataStore } from "@/shared/stores/data";
import { useUIStore } from "@/shared/stores/ui";
import { useScopedReturns, useScopedOrders } from "@/shared/hooks/useScopedData";
import { useAuthStore } from "@/features/auth/stores/auth";
import { formatKg } from "@/shared/utils";
import { ReceiveStockDialog } from "@/features/warehouse-ops/components/ReceiveStockDialog";

const PENDING_RETURN_STATUSES = ["CREATED", "PROCESSING", "RETURNING"] as const;

export default function InboundPage() {
  const returns = useScopedReturns();
  const orders = useScopedOrders();
  const customers = useDataStore((s) => s.customers);
  const receiveReturnToWarehouse = useDataStore((s) => s.receiveReturnToWarehouse);
  const currentWarehouseId = useUIStore((s) => s.currentWarehouseId);
  const actorId = useAuthStore((s) => s.currentUser?.id ?? "system");

  const [receiveOpen, setReceiveOpen] = useState(false);

  const pendingReturns = returns.filter((r) =>
    (PENDING_RETURN_STATUSES as readonly string[]).includes(r.status)
  );

  function handleReceiveReturn(id: string, code: string) {
    const res = receiveReturnToWarehouse(id, actorId);
    if (!res.ok) {
      toast.error(res.reason ?? "Không thể nhập kho hàng trả");
      return;
    }
    toast.success(`Đã nhập kho hàng trả ${code} — tồn kho đã cập nhật`);
  }

  return (
    <>
      <Topbar title="Nhập kho" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <Tabs defaultValue="new">
          <TabsList>
            <TabsTrigger value="new">Nhập hàng mới</TabsTrigger>
            <TabsTrigger value="returns">
              Hàng trả về kho
              {pendingReturns.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">({pendingReturns.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-4">
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <PackagePlus className="h-10 w-10 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Ghi nhận hàng nhập kho theo SKU và số lượng. Tồn kho sẽ tăng tương ứng.
                </p>
                <Button onClick={() => setReceiveOpen(true)}>
                  <PackagePlus className="h-4 w-4" /> Nhập hàng mới
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="returns" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Mã trả</th>
                        <th className="px-4 py-3 font-medium">Đơn gốc</th>
                        <th className="px-4 py-3 font-medium">Khách hàng</th>
                        <th className="px-4 py-3 font-medium">Lý do</th>
                        <th className="px-4 py-3 font-medium">KL trả</th>
                        <th className="px-4 py-3 font-medium">Trạng thái</th>
                        <th className="px-4 py-3 font-medium w-32"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingReturns.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                            Không có hàng trả chờ nhập kho
                          </td>
                        </tr>
                      )}
                      {pendingReturns.map((r) => {
                        const o = orders.find((oo) => oo.id === r.originalOrderId);
                        const c = o ? customers.find((cc) => cc.id === o.customerId) : null;
                        const hasItems = (o?.items?.length ?? 0) > 0;
                        return (
                          <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-mono">{r.code}</td>
                            <td className="px-4 py-3">
                              {o && (
                                <Link href={`/orders/${o.id}`} className="font-mono text-primary hover:underline">
                                  {o.code}
                                </Link>
                              )}
                            </td>
                            <td className="px-4 py-3">{c?.name ?? "—"}</td>
                            <td className="px-4 py-3 text-xs">{r.reasonLabel}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{formatKg(r.weightKg)}</td>
                            <td className="px-4 py-3">
                              <Badge variant="warning">{r.status}</Badge>
                            </td>
                            <td className="px-2 py-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReceiveReturn(r.id, r.code)}
                                title={hasItems ? undefined : "Đơn gốc không có SKU — chỉ đóng phiếu, không tăng tồn"}
                              >
                                <Undo2 className="h-4 w-4" /> Nhập kho trả
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ReceiveStockDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        defaultWarehouseId={currentWarehouseId}
      />
    </>
  );
}
