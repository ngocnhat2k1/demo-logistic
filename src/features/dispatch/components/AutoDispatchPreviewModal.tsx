"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Sparkles, Truck, ArrowRight, AlertTriangle, Package } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { suggestVehicles } from "@/features/dispatch/domain/dispatchHeuristic";
import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { formatKg } from "@/shared/utils";
import type { Order, Vehicle } from "@/shared/types";

interface Props {
  orders: Order[];
  open: boolean;
  onClose: () => void;
}

interface PlanRow {
  order: Order;
  vehicle?: Vehicle;
  score?: number;
  reasons?: string[];
}

function buildPlan(orders: Order[], vehicles: Vehicle[]): PlanRow[] {
  const reserved = new Set<string>();
  const rows: PlanRow[] = [];
  for (const order of orders) {
    const pool = vehicles.filter((v) => !reserved.has(v.id));
    const sugg = suggestVehicles({ order, vehicles: pool });
    if (sugg.length === 0) {
      rows.push({ order });
      continue;
    }
    const top = sugg[0];
    const v = vehicles.find((x) => x.id === top.vehicleId);
    if (!v) {
      rows.push({ order });
      continue;
    }
    reserved.add(v.id);
    rows.push({ order, vehicle: v, score: top.score, reasons: top.reasons });
  }
  return rows;
}

export function AutoDispatchPreviewModal({ orders, open, onClose }: Props) {
  const vehicles = useDataStore((s) => s.vehicles);
  const customers = useDataStore((s) => s.customers);
  const assignOrderToVehicle = useDataStore((s) => s.assignOrderToVehicle);
  const pushNotification = useDataStore((s) => s.pushNotification);
  const user = useAuthStore((s) => s.currentUser);

  const plan = useMemo(() => (open ? buildPlan(orders, vehicles) : []), [open, orders, vehicles]);

  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setExcluded(new Set());
  }, [open]);

  const matched = plan.filter((r) => r.vehicle);
  const unmatched = plan.filter((r) => !r.vehicle);
  const selectedCount = matched.filter((r) => !excluded.has(r.order.id)).length;

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    if (!user) return;
    let ok = 0;
    let fail = 0;
    for (const row of matched) {
      if (excluded.has(row.order.id) || !row.vehicle) continue;
      const a = assignOrderToVehicle(row.order.id, row.vehicle.id, user.id);
      if (a) {
        ok++;
      } else {
        fail++;
      }
    }
    if (ok > 0) {
      pushNotification({
        type: "ORDER_DISPATCHED",
        severity: "info",
        title: "Tự động phân xe",
        message: `Đã phân ${ok} đơn qua AI`,
        targetRoles: ["DRIVER", "DISPATCHER"],
      });
      toast.success(`Đã phân ${ok} đơn${fail > 0 ? `, ${fail} đơn thất bại` : ""}`);
    } else if (fail > 0) {
      toast.error(`Không phân được đơn nào (${fail} lỗi)`);
    }
    onClose();
  }

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI tự động phân xe
          </DialogTitle>
          <DialogDescription>
            Xem trước phương án phân xe cho {orders.length} đơn chờ. Bỏ tick để loại đơn không muốn phân.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 -mx-2 px-2">
          {orders.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Không có đơn nào chờ phân.</p>
          )}

          {matched.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Phương án ({matched.length})
              </p>
              {matched.map((row) => {
                const isOff = excluded.has(row.order.id);
                return (
                  <label
                    key={row.order.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                      isOff ? "bg-muted/50 opacity-60" : "bg-card hover:border-primary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!isOff}
                      onChange={() => toggle(row.order.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] items-center gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-primary">{row.order.code}</p>
                        <p className="text-xs font-medium truncate">{customerName(row.order.customerId)}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{row.order.dropoff.address}</p>
                      </div>
                      <ArrowRight className="hidden md:block h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5" /> {row.vehicle!.plateNumber}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.vehicle!.driverName} • Tải {formatKg(row.vehicle!.capacityKg)}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {row.reasons?.[0]}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className="text-[10px] mb-1">
                          {formatKg(row.order.weightKg)}
                        </Badge>
                        <p className="text-sm font-bold text-primary">{row.score}/100</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {unmatched.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs uppercase tracking-wider text-warning font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Không tìm được xe ({unmatched.length})
              </p>
              {unmatched.map((row) => (
                <div
                  key={row.order.id}
                  className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-center gap-3"
                >
                  <Package className="h-4 w-4 text-warning shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-semibold">{row.order.code}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {customerName(row.order.customerId)} • {formatKg(row.order.weightKg)} •{" "}
                      {row.order.dropoff.address}
                    </p>
                  </div>
                  <span className="text-[11px] text-warning">Hết xe phù hợp</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Sẽ phân <span className="font-semibold text-foreground">{selectedCount}</span> /{" "}
            {matched.length} đơn
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Huỷ
            </Button>
            <Button onClick={confirm} disabled={selectedCount === 0}>
              <Sparkles className="h-4 w-4 mr-1.5" />
              Xác nhận phân {selectedCount} đơn
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
