"use client";

import { useMemo, useState } from "react";
import { Search, Globe } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { useDataStore } from "@/shared/stores/data";
import { useScopedMovements, useWarehouseScope } from "@/shared/hooks/useScopedData";
import { formatKg } from "@/shared/utils";
import type { StockDirection } from "@/shared/types";

const DIRECTION_LABEL: Record<StockDirection, string> = {
  INBOUND: "Nhập",
  OUTBOUND: "Xuất",
  ADJUST: "Điều chỉnh",
};

export default function InventoryPage() {
  const movements = useScopedMovements();
  const products = useDataStore((s) => s.products);
  const warehouses = useDataStore((s) => s.warehouses);
  const { isAll } = useWarehouseScope();
  const [q, setQ] = useState("");

  // Tồn kho derive từ sổ cái (đã scoped). Tính MỘT lần.
  const stock = useMemo(() => {
    const out: Record<string, number> = {};
    for (const m of movements) out[m.productId] = (out[m.productId] ?? 0) + m.qtyDelta;
    return out;
  }, [movements]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const warehouseById = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);

  const rows = useMemo(() => {
    const t = q.toLowerCase().trim();
    return products
      .map((p) => ({ product: p, qty: stock[p.id] ?? 0 }))
      .filter(({ product }) => {
        if (!t) return true;
        return product.sku.toLowerCase().includes(t) || product.name.toLowerCase().includes(t);
      });
  }, [products, stock, q]);

  const history = useMemo(() => movements.slice(0, 200), [movements]);

  return (
    <>
      <Topbar title="Tồn kho" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {isAll && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            Đang xem tổng hợp tất cả kho. Chọn một kho cụ thể (góc trên) để xem riêng từng kho.
          </div>
        )}

        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock">Tồn hiện tại</TabsTrigger>
            <TabsTrigger value="history">Lịch sử nhập/xuất</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="mt-4 space-y-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo SKU, tên sản phẩm..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Sản phẩm</th>
                        <th className="px-4 py-3 font-medium">Đơn vị</th>
                        <th className="px-4 py-3 font-medium text-right">Tồn</th>
                        <th className="px-4 py-3 font-medium text-right">Ước tính TL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                            Chưa có dữ liệu tồn kho
                          </td>
                        </tr>
                      )}
                      {rows.map(({ product, qty }) => (
                        <tr key={product.id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-[11px] text-muted-foreground">{product.sku}</span>
                            <p className="font-medium">{product.name}</p>
                          </td>
                          <td className="px-4 py-3">{product.unit}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            <span className={qty <= 0 ? "text-destructive" : undefined}>{qty}</span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap text-muted-foreground">
                            {formatKg(qty * product.unitWeightKg)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Thời gian</th>
                        {isAll && <th className="px-4 py-3 font-medium">Kho</th>}
                        <th className="px-4 py-3 font-medium">Sản phẩm</th>
                        <th className="px-4 py-3 font-medium">Loại</th>
                        <th className="px-4 py-3 font-medium text-right">Thay đổi</th>
                        <th className="px-4 py-3 font-medium">Nguồn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length === 0 && (
                        <tr>
                          <td colSpan={isAll ? 6 : 5} className="px-4 py-12 text-center text-muted-foreground">
                            Chưa có giao dịch
                          </td>
                        </tr>
                      )}
                      {history.map((m) => {
                        const p = productById.get(m.productId);
                        const w = warehouseById.get(m.warehouseId);
                        return (
                          <tr key={m.id} className="border-t">
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(m.at), "dd/MM HH:mm", { locale: vi })}
                            </td>
                            {isAll && <td className="px-4 py-3 text-xs">{w?.name ?? "—"}</td>}
                            <td className="px-4 py-3">
                              <span className="font-mono text-[11px] text-muted-foreground">{p?.sku ?? m.productId}</span>
                              <p className="text-xs">{p?.name ?? "—"}</p>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={m.direction === "OUTBOUND" ? "destructive" : "success"}>
                                {DIRECTION_LABEL[m.direction]}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                              <span className={m.qtyDelta < 0 ? "text-destructive" : "text-success"}>
                                {m.qtyDelta > 0 ? "+" : ""}
                                {m.qtyDelta}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {m.refType}
                              {m.refId ? ` · ${m.refId}` : ""}
                              {m.note ? ` · ${m.note}` : ""}
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
    </>
  );
}
