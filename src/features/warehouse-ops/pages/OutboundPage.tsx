"use client";

import { useMemo, useRef, useState } from "react";
import { Search, PackageMinus, CheckCircle2, FileSpreadsheet, Download, Upload } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { useDataStore } from "@/shared/stores/data";
import { useUIStore } from "@/shared/stores/ui";
import { useScopedOrders, useScopedMovements } from "@/shared/hooks/useScopedData";
import { formatKg } from "@/shared/utils";
import { ORDER_STATUS_LABEL } from "@/features/orders/domain/orderStatus";
import { OutboundDialog } from "@/features/warehouse-ops/components/OutboundDialog";
import { IssueStockDialog } from "@/features/warehouse-ops/components/IssueStockDialog";
import type { Order } from "@/shared/types";

const OUT_SOURCE_LABEL: Record<string, string> = {
  ORDER: "Theo đơn",
  MANUAL: "Phiếu xuất",
  ADJUST: "Điều chỉnh",
};

export default function OutboundPage() {
  const orders = useScopedOrders();
  const movements = useScopedMovements();
  const customers = useDataStore((s) => s.customers);
  const products = useDataStore((s) => s.products);
  const currentWarehouseId = useUIStore((s) => s.currentWarehouseId);

  const [q, setQ] = useState("");
  const [active, setActive] = useState<Order | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [importLines, setImportLines] = useState<{ productId: string; quantity: string }[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const ready = useMemo(
    () => orders.filter((o) => o.status === "DISPATCHED" || o.status === "PICKED_UP"),
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

  // Phiếu xuất gần đây: mọi giao dịch giảm tồn (OUTBOUND), mới nhất trước.
  const recentOutbound = useMemo(
    () =>
      movements
        .filter((m) => m.direction === "OUTBOUND")
        .slice()
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 100),
    [movements]
  );

  async function exportExcel() {
    if (recentOutbound.length === 0) {
      toast.error("Chưa có dữ liệu xuất kho để xuất file");
      return;
    }
    const XLSX = await import("xlsx");
    const data = recentOutbound.map((m) => {
      const p = productById.get(m.productId);
      return {
        "Thời gian": format(new Date(m.at), "dd/MM/yyyy HH:mm"),
        SKU: p?.sku ?? m.productId,
        "Tên sản phẩm": p?.name ?? "",
        "Số lượng": Math.abs(m.qtyDelta),
        Nguồn: OUT_SOURCE_LABEL[m.refType] ?? m.refType,
        "Tham chiếu": m.refId ?? "",
        "Ghi chú": m.note ?? "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "XuatKho");
    XLSX.writeFile(wb, `phieu-xuat-kho-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Đã xuất ${data.length} dòng ra Excel`);
  }

  function downloadTemplate() {
    const csv = "sku,quantity,note\nSKU-TD-01,10,Xuất bán\nSKU-XD-01,5,Chuyển kho";
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau-xuat-kho.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const lines: { productId: string; quantity: string }[] = [];
      const unmatched: string[] = [];
      for (const r of data) {
        const sku = String(r.sku ?? r.SKU ?? r["Mã SKU"] ?? "").trim().toUpperCase();
        const qty = Number(r.quantity ?? r.SoLuong ?? r["Số lượng"] ?? 0);
        const p = products.find((pp) => pp.sku.toUpperCase() === sku);
        if (p && Number.isFinite(qty) && qty > 0) lines.push({ productId: p.id, quantity: String(qty) });
        else if (sku) unmatched.push(sku);
      }
      if (lines.length === 0) {
        toast.error("Không đọc được dòng hợp lệ (cần cột sku + quantity)");
        return;
      }
      setImportLines(lines);
      setIssueOpen(true);
      toast.success(`Đã đọc ${lines.length} dòng từ Excel — kiểm tra & xác nhận`);
      if (unmatched.length) {
        toast.warning(`Bỏ qua ${unmatched.length} SKU không khớp: ${unmatched.slice(0, 5).join(", ")}`);
      }
    } catch (err) {
      toast.error("Không đọc được file: " + (err as Error).message);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <>
      <Topbar title="Xuất kho" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <Tabs defaultValue="byOrder">
          <TabsList>
            <TabsTrigger value="byOrder">Xuất theo đơn giao</TabsTrigger>
            <TabsTrigger value="slips">Phiếu xuất kho</TabsTrigger>
          </TabsList>

          {/* ----- Xuất theo đơn giao ----- */}
          <TabsContent value="byOrder" className="mt-4 space-y-4">
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
          </TabsContent>

          {/* ----- Phiếu xuất kho (thủ công) ----- */}
          <TabsContent value="slips" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  setImportLines(null);
                  setIssueOpen(true);
                }}
              >
                <PackageMinus className="h-4 w-4" /> Tạo phiếu xuất
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Import Excel
              </Button>
              <Button variant="outline" onClick={exportExcel}>
                <FileSpreadsheet className="h-4 w-4" /> Export Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4" /> Tải mẫu
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onImportFile}
                className="hidden"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Phiếu xuất gần đây</p>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left">
                        <tr>
                          <th className="px-4 py-3 font-medium">Thời gian</th>
                          <th className="px-4 py-3 font-medium">Sản phẩm</th>
                          <th className="px-4 py-3 font-medium text-right">Số lượng</th>
                          <th className="px-4 py-3 font-medium">Nguồn</th>
                          <th className="px-4 py-3 font-medium">Ghi chú / Tham chiếu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOutbound.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                              Chưa có phiếu xuất nào. Bấm “Tạo phiếu xuất”.
                            </td>
                          </tr>
                        )}
                        {recentOutbound.map((m) => {
                          const p = productById.get(m.productId);
                          return (
                            <tr key={m.id} className="border-t hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(m.at), "dd/MM HH:mm", { locale: vi })}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {p?.sku ?? m.productId}
                                </span>
                                <p className="text-xs">{p?.name ?? "—"}</p>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-destructive whitespace-nowrap">
                                {m.qtyDelta}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={m.refType === "MANUAL" ? "default" : "secondary"}>
                                  {OUT_SOURCE_LABEL[m.refType] ?? m.refType}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {m.note ?? (m.refId ? m.refId : "—")}
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
          </TabsContent>
        </Tabs>
      </div>

      <OutboundDialog
        open={!!active}
        order={active}
        onOpenChange={(v) => {
          if (!v) setActive(null);
        }}
      />

      <IssueStockDialog
        open={issueOpen}
        onOpenChange={(v) => {
          setIssueOpen(v);
          if (!v) setImportLines(null);
        }}
        defaultWarehouseId={currentWarehouseId}
        initialLines={importLines}
      />
    </>
  );
}
