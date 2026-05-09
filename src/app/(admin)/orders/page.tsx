"use client";

import { Topbar } from "@/components/shared/Topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataStore } from "@/lib/stores/data";
import { useMemo, useState } from "react";
import { Plus, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ORDER_STATUS_LABEL } from "@/lib/domain/orderStatus";
import type { OrderStatus } from "@/types";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatKg } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_OPTIONS: (OrderStatus | "ALL")[] = [
  "ALL",
  "NEW",
  "PENDING_DISPATCH",
  "DISPATCHED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RETURN_PROCESSING",
  "CANCELLED",
];

export default function OrdersPage() {
  const orders = useDataStore((s) => s.orders);
  const customers = useDataStore((s) => s.customers);
  const sp = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(sp.get("status") || "ALL");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (status !== "ALL" && o.status !== status) return false;
      if (q) {
        const c = customers.find((c) => c.id === o.customerId);
        const hay = `${o.code} ${c?.name ?? ""} ${o.dropoff.address} ${o.pickup.address}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [orders, customers, q, status]);

  return (
    <>
      <Topbar title="Đơn hàng" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-md min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm theo mã đơn, KH, địa chỉ..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "ALL" ? "Tất cả trạng thái" : ORDER_STATUS_LABEL[s as OrderStatus]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button asChild variant="outline">
              <Link href="/orders/import">
                <Upload className="h-4 w-4" /> Import Excel
              </Link>
            </Button>
            <Button asChild>
              <Link href="/orders/new">
                <Plus className="h-4 w-4" /> Tạo đơn
              </Link>
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{filtered.length} đơn hàng</p>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Mã đơn</th>
                    <th className="px-4 py-3 font-medium">Khách hàng</th>
                    <th className="px-4 py-3 font-medium">Tuyến</th>
                    <th className="px-4 py-3 font-medium">KL</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium">Tạo lúc</th>
                    <th className="px-4 py-3 font-medium">Nguồn</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Không có đơn hàng phù hợp</td></tr>
                  )}
                  {filtered.slice(0, 100).map((o) => {
                    const c = customers.find((cc) => cc.id === o.customerId);
                    return (
                      <tr key={o.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link href={`/orders/${o.id}`} className="font-mono text-primary hover:underline">{o.code}</Link>
                        </td>
                        <td className="px-4 py-3">{c?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[280px]">
                          <div className="truncate">{o.pickup.address}</div>
                          <div className="truncate">→ {o.dropoff.address}</div>
                        </td>
                        <td className="px-4 py-3">{formatKg(o.weightKg)}</td>
                        <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {format(new Date(o.createdAt), "dd/MM HH:mm", { locale: vi })}
                        </td>
                        <td className="px-4 py-3"><Badge variant="secondary">{o.source}</Badge></td>
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
