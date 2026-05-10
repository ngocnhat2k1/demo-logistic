"use client";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useDataStore } from "@/shared/stores/data";
import { useMemo, useState } from "react";
import { Plus, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ORDER_STATUS_LABEL } from "@/features/orders/domain/orderStatus";
import type { OrderStatus } from "@/shared/types";
import { StatusBadge } from "@/features/orders/components/StatusBadge";
import { CreateOrderDialog } from "@/features/orders/components/CreateOrderDialog";
import { ImportOrderDialog } from "@/features/orders/components/ImportOrderDialog";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatKg } from "@/shared/utils";
import { Badge } from "@/shared/ui/badge";

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

export default function OrderListPage() {
  const orders = useDataStore((s) => s.orders);
  const customers = useDataStore((s) => s.customers);
  const sp = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(sp.get("status") || "ALL");
  const [customerId, setCustomerId] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    const fromTs = fromDate ? new Date(fromDate + "T00:00:00").getTime() : null;
    const toTs = toDate ? new Date(toDate + "T23:59:59").getTime() : null;
    return orders.filter((o) => {
      if (status !== "ALL" && o.status !== status) return false;
      if (customerId !== "ALL" && o.customerId !== customerId) return false;
      const created = new Date(o.createdAt).getTime();
      if (fromTs !== null && created < fromTs) return false;
      if (toTs !== null && created > toTs) return false;
      if (q) {
        const c = customers.find((c) => c.id === o.customerId);
        const hay = `${o.code} ${c?.name ?? ""} ${o.dropoff.address} ${o.pickup.address}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [orders, customers, q, status, customerId, fromDate, toDate]);

  const hasActiveFilter =
    status !== "ALL" || customerId !== "ALL" || fromDate !== "" || toDate !== "" || q !== "";

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
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Tất cả khách hàng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả khách hàng</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[150px]"
              aria-label="Từ ngày"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[150px]"
              aria-label="Đến ngày"
            />
          </div>
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setStatus("ALL");
                setCustomerId("ALL");
                setFromDate("");
                setToDate("");
              }}
            >
              Xoá lọc
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import Excel
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Tạo đơn
            </Button>
          </div>
        </div>

        <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} onOpenImport={() => setImportOpen(true)} />
        <ImportOrderDialog open={importOpen} onOpenChange={setImportOpen} />

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
