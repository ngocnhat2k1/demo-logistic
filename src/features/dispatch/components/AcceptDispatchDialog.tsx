"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Truck, Weight } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input, Label, Textarea } from "@/shared/ui/input";
import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { checkQuota, quotaInUse, quotaLabel } from "@/features/orders/domain/quota";
import { formatKg } from "@/shared/utils";
import type { Order, Vehicle } from "@/shared/types";

interface Props {
  order: Order | null;
  vehicle: Vehicle | null;
  onClose: () => void;
}

export function AcceptDispatchDialog({ order, vehicle, onClose }: Props) {
  const customers = useDataStore((s) => s.customers);
  const adjustOrderWeight = useDataStore((s) => s.adjustOrderWeight);
  const applyQuotaOverride = useDataStore((s) => s.applyQuotaOverride);
  const assignOrderToVehicle = useDataStore((s) => s.assignOrderToVehicle);
  const pushNotification = useDataStore((s) => s.pushNotification);
  const user = useAuthStore((s) => s.currentUser);

  const [actualKg, setActualKg] = useState<number>(0);
  const [extraCostNote, setExtraCostNote] = useState("");
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
    if (order) {
      setActualKg(order.actualWeightKg ?? order.weightKg);
      setExtraCostNote(order.extraCostNote ?? "");
      setOverride(false);
      setOverrideReason("");
    }
  }, [order?.id]);

  const customer = useMemo(
    () => (order ? customers.find((c) => c.id === order.customerId) : null),
    [order, customers]
  );

  if (!order || !vehicle) return null;

  const declaredKg = order.weightKg;
  const diff = actualKg - declaredKg;
  const hasDiff = Math.abs(diff) > 0.0001;
  const overflowVehicle = vehicle.capacityKg < actualKg;

  // Quota check uses delta vs already-reserved declared amount.
  // The order's declared weight is already reserved on creation; the new check is for the *additional* kg if heavier.
  const addKg = Math.max(0, diff); // if lighter, no quota strain — just refund
  const quotaCheck = customer ? checkQuota(customer, addKg) : null;
  const canManagerOverride = user?.role === "ADMIN" || user?.role === "OPS_MANAGER";
  const blocked =
    overflowVehicle ||
    (!!quotaCheck && quotaCheck.level === "block" && !override);

  function handleConfirm() {
    if (!user || !order || !vehicle || !customer) return;
    if (overflowVehicle) {
      toast.error(`Vượt tải xe: ${formatKg(actualKg)} > ${formatKg(vehicle.capacityKg)}`);
      return;
    }
    if (quotaCheck && quotaCheck.level === "block" && !override) {
      toast.error(quotaCheck.reason || "Vượt hạn mức");
      return;
    }
    if (override) {
      if (!overrideReason.trim()) {
        toast.error("Vui lòng nhập lý do override");
        return;
      }
      applyQuotaOverride(order.id, user.id, user.fullName, user.role, overrideReason.trim());
    }
    if (hasDiff || extraCostNote.trim()) {
      adjustOrderWeight(
        order.id,
        actualKg,
        user.id,
        hasDiff ? extraCostNote.trim() || undefined : extraCostNote.trim() || undefined
      );
    }
    const a = assignOrderToVehicle(order.id, vehicle.id, user.id, actualKg);
    if (!a) {
      toast.error("Không phân xe được");
      return;
    }
    if (hasDiff) {
      pushNotification({
        type: "GENERIC",
        severity: "warning",
        title: "Chênh lệch trọng lượng",
        message: `${order.code}: kê khai ${formatKg(declaredKg)} → thực tế ${formatKg(actualKg)} (${diff > 0 ? "+" : ""}${formatKg(diff)})${
          extraCostNote ? ` — ${extraCostNote}` : ""
        }`,
        targetRoles: ["OPS_MANAGER", "DISPATCHER", "SALES"],
      });
    }
    pushNotification({
      type: "ORDER_DISPATCHED",
      severity: "info",
      title: "Đã phân xe",
      message: `${order.code} → ${vehicle.plateNumber}`,
      targetRoles: ["DRIVER", "DISPATCHER"],
    });
    toast.success(`Đã phân ${order.code} cho ${vehicle.plateNumber}`);
    onClose();
  }

  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Tiếp nhận đơn {order.code}</DialogTitle>
          <DialogDescription>
            Kiểm tra trọng lượng thực tế và hạn mức khách hàng trước khi phân xe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vehicle / driver summary */}
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            <p className="flex items-center gap-2 font-medium">
              <Truck className="h-4 w-4" /> {vehicle.plateNumber} • Tải{" "}
              {formatKg(vehicle.capacityKg)}
            </p>
            <p className="text-muted-foreground">
              Tài xế: {vehicle.driverName} ({vehicle.driverLicenseClass}) • {vehicle.driverPhone}
            </p>
          </div>

          {/* Weight check */}
          <div className="space-y-2">
            <Label>Trọng lượng thực tế (kg) *</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={actualKg}
                onChange={(e) => setActualKg(Number(e.target.value))}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Kê khai: {formatKg(declaredKg)}
              </span>
            </div>

            {hasDiff && (
              <div className="flex items-start gap-2 rounded-md border border-warning bg-warning/5 p-2.5 text-xs text-warning">
                <Weight className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">
                    Chênh lệch {diff > 0 ? "+" : ""}
                    {formatKg(diff)} so với kê khai
                  </p>
                  <p className="text-[11px]">
                    Cần ghi chú để xử lý chi phí phát sinh ({diff > 0 ? "thu thêm" : "hoàn"} cước).
                  </p>
                </div>
              </div>
            )}

            {hasDiff && (
              <div className="space-y-1">
                <Label className="text-xs">Ghi chú chi phí phát sinh</Label>
                <Textarea
                  rows={2}
                  placeholder="VD: Thu thêm 200kg @ 800đ/kg = 160.000đ; KH đã đồng ý qua điện thoại."
                  value={extraCostNote}
                  onChange={(e) => setExtraCostNote(e.target.value)}
                />
              </div>
            )}

            {overflowVehicle && (
              <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/5 p-2.5 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Vượt tải xe — chọn xe khác hoặc tách đơn.
              </div>
            )}
          </div>

          {/* Quota panel */}
          {customer && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  Hạn mức KH: {customer.name} • {quotaLabel(customer.quota)}
                </span>
                {customer.quota.type === "POSTPAID" ? (
                  <span className="text-muted-foreground">
                    Công nợ: {formatKg(customer.quota.outstanding ?? 0)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Đã dùng {formatKg(quotaInUse(customer.quota))} /{" "}
                    {formatKg(customer.quota.limit)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Đơn này: {formatKg(actualKg)}
                {addKg > 0 && (
                  <> · cần thêm {formatKg(addKg)} so với kê khai</>
                )}
              </p>
            </div>
          )}

          {quotaCheck && quotaCheck.level !== "ok" && (
            <div
              className={`flex items-start gap-3 rounded-md border p-3 text-sm ${
                quotaCheck.level === "block"
                  ? "border-destructive bg-destructive/5 text-destructive"
                  : "border-warning bg-warning/5 text-warning"
              }`}
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="font-medium">
                  {quotaCheck.level === "block"
                    ? "Vượt hạn mức — chặn tiếp nhận"
                    : "Cảnh báo: gần đầy hạn mức"}
                </p>
                <p className="text-xs">{quotaCheck.reason}</p>
                {quotaCheck.level === "block" && canManagerOverride && (
                  <div className="space-y-1 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={override}
                        onChange={(e) => setOverride(e.target.checked)}
                      />
                      <span className="text-xs font-medium">
                        Override (Manager+) — sẽ được ghi log
                      </span>
                    </label>
                    {override && (
                      <Input
                        placeholder="Lý do override (bắt buộc)"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                      />
                    )}
                  </div>
                )}
                {quotaCheck.level === "block" && !canManagerOverride && (
                  <p className="text-[11px]">
                    Chỉ ADMIN / OPS_MANAGER mới được phép override.
                  </p>
                )}
              </div>
            </div>
          )}

          {!blocked && quotaCheck?.level === "ok" && !overflowVehicle && !hasDiff && (
            <div className="flex items-center gap-2 rounded-md border border-success bg-success/5 p-2.5 text-xs text-success">
              <CheckCircle2 className="h-4 w-4" />
              Hợp lệ — sẵn sàng phân xe.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={handleConfirm} disabled={blocked}>
            Tiếp nhận & phân xe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
