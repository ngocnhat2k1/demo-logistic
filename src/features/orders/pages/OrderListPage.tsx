"use client";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useDataStore } from "@/shared/stores/data";
import { useMemo, useState } from "react";
import { Plus, Search, Upload, MapPin, X, Pencil } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ORDER_STATUS_LABEL, canEdit } from "@/features/orders/domain/orderStatus";
import type { Order, OrderStatus } from "@/shared/types";
import { StatusBadge } from "@/features/orders/components/StatusBadge";
import { CreateOrderDialog } from "@/features/orders/components/CreateOrderDialog";
import { ImportOrderDialog } from "@/features/orders/components/ImportOrderDialog";
import { EditOrderInfoDialog } from "@/features/orders/components/EditOrderInfoDialog";
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
  const [editOrder, setEditOrder] = useState<Order | null>(null);

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

  function clearFilters() {
    setQ("");
    setStatus("ALL");
    setCustomerId("ALL");
    setFromDate("");
    setToDate("");
  }

  return (
    <>
      <Topbar title="Đơn hàng" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* Toolbar: search + actions */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã đơn, KH, địa chỉ..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 sm:flex-shrink-0">
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" /> Import Excel
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Tạo đơn
              </Button>
            </div>
          </div>

          {/* Filters: 1 col mobile, 2 cols sm, 4 cols lg */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
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
              <SelectTrigger>
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
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="Từ ngày"
              placeholder="Từ ngày"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="Đến ngày"
              placeholder="Đến ngày"
            />
          </div>

          {/* Result count + clear filters */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> đơn hàng
            </p>
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" /> Xoá lọc
              </Button>
            )}
          </div>
        </div>

        <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} onOpenImport={() => setImportOpen(true)} />
        <ImportOrderDialog open={importOpen} onOpenChange={setImportOpen} />
        <EditOrderInfoDialog
          order={editOrder}
          open={editOrder !== null}
          onOpenChange={(open) => !open && setEditOrder(null)}
        />

        {/* Mobile: card list */}
        <div className="md:hidden space-y-2">
          {filtered.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Không có đơn hàng phù hợp
              </CardContent>
            </Card>
          )}
          {filtered.slice(0, 100).map((o) => {
            const c = customers.find((cc) => cc.id === o.customerId);
            return (
              <Card key={o.id} className="hover:border-primary transition">
                <CardContent className="p-3 space-y-2">
                  <Link href={`/orders/${o.id}`} className="block space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-semibold text-primary">{o.code}</p>
                        <p className="font-medium text-sm truncate">{c?.name ?? "—"}</p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-success" />
                        <span className="truncate">{o.pickup.address}</span>
                      </p>
                      <p className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-destructive" />
                        <span className="truncate">{o.dropoff.address}</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t">
                      <span className="font-semibold">{formatKg(o.weightKg)}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(o.createdAt), "dd/MM HH:mm", { locale: vi })}
                      </span>
                      <Badge variant="secondary">{o.source}</Badge>
                    </div>
                  </Link>
                  {canEdit(o.status) && (
                    <div className="flex justify-end pt-1">
                      <Button variant="outline" size="sm" onClick={() => setEditOrder(o)}>
                        <Pencil className="h-3.5 w-3.5" /> Sửa thông tin
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Desktop: table */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Mã đơn</th>
                    <th className="px-4 py-3 font-medium">Khách hàng</th>
                    <th className="px-4 py-3 font-medium">Tuyến</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">KL</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Trạng thái</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Tạo lúc</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Nguồn</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        Không có đơn hàng phù hợp
                      </td>
                    </tr>
                  )}
                  {filtered.slice(0, 100).map((o) => {
                    const c = customers.find((cc) => cc.id === o.customerId);
                    return (
                      <tr key={o.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link href={`/orders/${o.id}`} className="font-mono text-primary hover:underline">
                            {o.code}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{c?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[280px]">
                          <div className="truncate">{o.pickup.address}</div>
                          <div className="truncate">→ {o.dropoff.address}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatKg(o.weightKg)}</td>
                        <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(o.createdAt), "dd/MM HH:mm", { locale: vi })}
                        </td>
                        <td className="px-4 py-3"><Badge variant="secondary">{o.source}</Badge></td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {canEdit(o.status) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditOrder(o)}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Sửa
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
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
