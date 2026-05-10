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

function completeReturn(id: string, code: string) {
  useDataStore.setState((s) => ({
    returns: s.returns.map((x) =>
      x.id === id ? { ...x, status: "COMPLETED", completedAt: new Date().toISOString() } : x,
    ),
  }));
  toast.success(`Đã hoàn tất trả hàng ${code}`);
}

export default function ReturnsPage() {
  const returns = useDataStore((s) => s.returns);
  const orders = useDataStore((s) => s.orders);
  const customers = useDataStore((s) => s.customers);

  return (
    <>
      <Topbar title="Đơn trả hàng" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{returns.length}</span> đơn trả hàng
        </p>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {returns.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Chưa có đơn trả nào
              </CardContent>
            </Card>
          )}
          {returns.map((r) => {
            const o = orders.find((oo) => oo.id === r.originalOrderId);
            const c = o ? customers.find((cc) => cc.id === o.customerId) : null;
            return (
              <Card key={r.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold">{r.code}</p>
                      {o && (
                        <Link
                          href={`/orders/${o.id}`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {o.code}
                        </Link>
                      )}
                      <p className="text-sm font-medium truncate">{c?.name ?? "—"}</p>
                    </div>
                    <Badge
                      variant={
                        r.status === "COMPLETED"
                          ? "success"
                          : r.status === "RETURNING"
                            ? "default"
                            : "warning"
                      }
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="text-muted-foreground">{r.reasonLabel}</p>
                    <Badge
                      variant={r.reasonCategory === "FORCE_MAJEURE" ? "success" : "warning"}
                      className="text-[10px]"
                    >
                      {r.reasonCategory === "FORCE_MAJEURE" ? "Bất khả kháng" : "Chủ quan KH"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t">
                    <span>
                      {formatKg(r.weightKg)} • hoàn {r.refundPercent}% ={" "}
                      <span className="font-semibold">{formatKg(r.refundedKg)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {format(new Date(r.createdAt), "dd/MM HH:mm", { locale: vi })}
                    </span>
                  </div>
                  {r.status !== "COMPLETED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => completeReturn(r.id, r.code)}
                    >
                      Hoàn tất
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Desktop table */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Mã trả</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Đơn gốc</th>
                    <th className="px-4 py-3 font-medium">Khách hàng</th>
                    <th className="px-4 py-3 font-medium">Lý do</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Phân loại</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">KL trả / Hoàn HM</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Trạng thái</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Ngày tạo</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {returns.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                        Chưa có đơn trả nào
                      </td>
                    </tr>
                  )}
                  {returns.map((r) => {
                    const o = orders.find((oo) => oo.id === r.originalOrderId);
                    const c = o ? customers.find((cc) => cc.id === o.customerId) : null;
                    return (
                      <tr key={r.id} className="border-t">
                        <td className="px-4 py-3 font-mono">{r.code}</td>
                        <td className="px-4 py-3">
                          {o && (
                            <Link
                              href={`/orders/${o.id}`}
                              className="font-mono text-primary hover:underline"
                            >
                              {o.code}
                            </Link>
                          )}
                        </td>
                        <td className="px-4 py-3">{c?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-xs">{r.reasonLabel}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              r.reasonCategory === "FORCE_MAJEURE" ? "success" : "warning"
                            }
                          >
                            {r.reasonCategory === "FORCE_MAJEURE"
                              ? "Bất khả kháng"
                              : "Chủ quan KH"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {formatKg(r.weightKg)}
                          <div className="text-[11px] text-muted-foreground">
                            Hoàn {r.refundPercent}% = {formatKg(r.refundedKg)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              r.status === "COMPLETED"
                                ? "success"
                                : r.status === "RETURNING"
                                  ? "default"
                                  : "warning"
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(r.createdAt), "dd/MM HH:mm", { locale: vi })}
                        </td>
                        <td className="px-4 py-3">
                          {r.status !== "COMPLETED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => completeReturn(r.id, r.code)}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
