"use client";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { useDataStore } from "@/shared/stores/data";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatKg } from "@/shared/utils";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";

export default function ReturnsPage() {
  const returns = useDataStore((s) => s.returns);
  const orders = useDataStore((s) => s.orders);
  const customers = useDataStore((s) => s.customers);

  return (
    <>
      <Topbar title="Đơn trả hàng" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <p className="text-sm text-muted-foreground">{returns.length} đơn trả hàng</p>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Mã trả</th>
                  <th className="px-4 py-3 font-medium">Đơn gốc</th>
                  <th className="px-4 py-3 font-medium">Khách hàng</th>
                  <th className="px-4 py-3 font-medium">Lý do</th>
                  <th className="px-4 py-3 font-medium">Phân loại</th>
                  <th className="px-4 py-3 font-medium">KL trả / Hoàn HM</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium">Ngày tạo</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {returns.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">Chưa có đơn trả nào</td></tr>
                )}
                {returns.map((r) => {
                  const o = orders.find((oo) => oo.id === r.originalOrderId);
                  const c = o ? customers.find((cc) => cc.id === o.customerId) : null;
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-3 font-mono">{r.code}</td>
                      <td className="px-4 py-3">
                        {o && (
                          <Link href={`/orders/${o.id}`} className="font-mono text-primary hover:underline">{o.code}</Link>
                        )}
                      </td>
                      <td className="px-4 py-3">{c?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">{r.reasonLabel}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.reasonCategory === "FORCE_MAJEURE" ? "success" : "warning"}>
                          {r.reasonCategory === "FORCE_MAJEURE" ? "Bất khả kháng" : "Chủ quan KH"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {formatKg(r.weightKg)}
                        <div className="text-[11px] text-muted-foreground">
                          Hoàn {r.refundPercent}% = {formatKg(r.refundedKg)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={r.status === "COMPLETED" ? "success" : r.status === "RETURNING" ? "default" : "warning"}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(r.createdAt), "dd/MM HH:mm", { locale: vi })}
                      </td>
                      <td className="px-4 py-3">
                        {r.status !== "COMPLETED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              useDataStore.setState((s) => ({
                                returns: s.returns.map((x) =>
                                  x.id === r.id ? { ...x, status: "COMPLETED", completedAt: new Date().toISOString() } : x
                                ),
                              }));
                              toast.success(`Đã hoàn tất trả hàng ${r.code}`);
                            }}
                          >
                            Hoàn tất
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
