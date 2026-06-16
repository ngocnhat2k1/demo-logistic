"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Scale, Printer } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input, Label } from "@/shared/ui/input";
import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { deriveItemsWeight } from "@/features/warehouses/domain/inventory";
import { OutboundNotePrint } from "@/features/warehouse-ops/components/OutboundNotePrint";
import { formatKg } from "@/shared/utils";
import type { Order } from "@/shared/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export function OutboundDialog({ open, onOpenChange, order }: Props) {
  const recordOutbound = useDataStore((s) => s.recordOutbound);
  const customers = useDataStore((s) => s.customers);
  const actorId = useAuthStore((s) => s.currentUser?.id ?? "system");

  const items = order?.items ?? [];
  const plannedFromItems = useMemo(() => deriveItemsWeight(items), [items]);
  const declared = order?.declaredWeightKg ?? order?.weightKg ?? 0;
  const customer = order ? customers.find((c) => c.id === order.customerId) : null;

  const [scale, setScale] = useState("");
  const [extraCostNote, setExtraCostNote] = useState("");
  const [markPickedUp, setMarkPickedUp] = useState(false);

  useEffect(() => {
    if (!open || !order) return;
    setScale(order.actualWeightKg != null ? String(order.actualWeightKg) : String(declared));
    setExtraCostNote(order.extraCostNote ?? "");
    setMarkPickedUp(false);
  }, [open, order?.id]);

  if (!order) return null;

  const scaleN = Number(scale);
  const scaleValid = Number.isFinite(scaleN) && scaleN > 0;
  const diffVsDeclared = scaleValid ? scaleN - declared : 0;
  const diffVsItems = scaleValid ? scaleN - plannedFromItems : 0;
  const canMarkPickedUp = order.status === "DISPATCHED";

  function submit() {
    if (!order) return;
    if (!scaleValid) {
      toast.error("Số cân thực tế không hợp lệ");
      return;
    }
    const res = recordOutbound({
      orderId: order.id,
      actualWeightKg: scaleN,
      extraCostNote: extraCostNote.trim() || undefined,
      markPickedUp: markPickedUp && canMarkPickedUp,
      actorId,
    });
    if (!res.ok) {
      toast.error(res.reason ?? "Không thể xuất kho");
      return;
    }
    toast.success(`Đã xuất kho đơn ${order.code} — tồn kho đã trừ`);
    if (order.status === "PICKED_UP" && Math.abs(diffVsDeclared) > 0.0001) {
      toast.warning("Đơn đã lấy hàng — chênh lệch trọng lượng không điều chỉnh hạn mức");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Xuất kho — {order.code}</DialogTitle>
          <DialogDescription>
            {customer?.name ?? "—"} · giao tới {order.dropoff.address}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Items */}
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium">Sản phẩm</th>
                  <th className="px-3 py-2 font-medium text-right">SL</th>
                  <th className="px-3 py-2 font-medium text-right">TL dòng</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                      Đơn chưa có line item — không thể xuất kho
                    </td>
                  </tr>
                )}
                {items.map((it, idx) => (
                  <tr key={`${it.productId}-${idx}`} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{it.sku}</td>
                    <td className="px-3 py-2">{it.name}</td>
                    <td className="px-3 py-2 text-right">{it.quantity}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {formatKg(it.unitWeightKg * it.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Weigh */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Scale className="h-4 w-4" /> Cân thực tế (kg) *
              </Label>
              <Input
                type="number"
                value={scale}
                onChange={(e) => setScale(e.target.value)}
                placeholder={String(declared)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú chi phí phát sinh</Label>
              <Input
                value={extraCostNote}
                onChange={(e) => setExtraCostNote(e.target.value)}
                placeholder="VD: phụ phí quá tải"
              />
            </div>
          </div>

          {/* Cross-check */}
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">TL khai báo (kế hoạch)</span>
              <span className="font-medium">{formatKg(declared)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">TL suy ra từ SKU</span>
              <span className="font-medium">{formatKg(plannedFromItems)}</span>
            </div>
            {scaleValid && (
              <div className="flex items-center justify-between border-t pt-1">
                <span className="text-muted-foreground">Chênh lệch cân vs khai báo</span>
                <span
                  className={
                    Math.abs(diffVsDeclared) < 0.0001
                      ? "font-medium"
                      : "font-semibold text-warning"
                  }
                >
                  {diffVsDeclared > 0 ? "+" : ""}
                  {formatKg(diffVsDeclared)}
                </span>
              </div>
            )}
          </div>

          {scaleValid && Math.abs(diffVsItems) > 0.0001 && (
            <div className="flex items-start gap-2 rounded-md border border-warning bg-warning/5 p-3 text-xs text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Cân thực tế lệch {formatKg(Math.abs(diffVsItems))} so với tổng SKU — kiểm tra lại số
                lượng/đóng gói.
              </span>
            </div>
          )}

          {canMarkPickedUp && (
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={markPickedUp}
                onChange={(e) => setMarkPickedUp(e.target.checked)}
              />
              <span>Đánh dấu tài xế đã lấy hàng (chuyển sang “Đã lấy hàng”)</span>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button variant="outline" onClick={() => window.print()} disabled={items.length === 0}>
            <Printer className="h-4 w-4" /> In phiếu xuất kho
          </Button>
          <Button onClick={submit} disabled={items.length === 0 || !scaleValid}>
            Xác nhận xuất kho
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Phiếu in (ẩn trên màn hình, chỉ hiện khi window.print) */}
      <OutboundNotePrint order={order} />
    </Dialog>
  );
}
