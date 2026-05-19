"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Wrench, Gauge, History, CheckCircle2 } from "lucide-react";
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
import { Input, Label } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { formatKm, getMaintenanceInfo } from "@/features/fleet/utils";
import type { Vehicle } from "@/shared/types";

interface Props {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OdometerDialog({ vehicle, open, onOpenChange }: Props) {
  const recordOdometer = useDataStore((s) => s.recordOdometer);
  const markVehicleMaintained = useDataStore((s) => s.markVehicleMaintained);
  const user = useAuthStore((s) => s.currentUser);

  const [newKm, setNewKm] = useState<number>(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open && vehicle) {
      setNewKm(vehicle.odometerKm);
      setNote("");
    }
  }, [open, vehicle?.id]);

  const maint = useMemo(() => (vehicle ? getMaintenanceInfo(vehicle) : null), [vehicle]);

  if (!vehicle || !maint) return null;

  function submit() {
    if (!vehicle || !user) return;
    if (newKm === vehicle.odometerKm) {
      toast.info("Số km không thay đổi");
      return;
    }
    const r = recordOdometer(vehicle.id, newKm, user.id, { note: note.trim() || undefined });
    if (!r.ok) {
      toast.error(r.reason ?? "Không ghi nhận được");
      return;
    }
    toast.success(`Đã cập nhật ${formatKm(newKm)} cho ${vehicle.plateNumber}`);
    setNote("");
  }

  function doMarkMaintained() {
    if (!vehicle || !user) return;
    if (!confirm(`Đánh dấu xe ${vehicle.plateNumber} đã bảo trì ở mốc ${formatKm(vehicle.odometerKm)}?`)) return;
    markVehicleMaintained(vehicle.id, user.id);
    toast.success(`Đã reset chu kỳ bảo trì cho ${vehicle.plateNumber}`);
  }

  const barColor =
    maint.state === "overdue"
      ? "bg-destructive"
      : maint.state === "due_soon"
        ? "bg-warning"
        : "bg-primary";

  const stateBadge =
    maint.state === "overdue" ? (
      <Badge variant="destructive">Quá hạn bảo trì</Badge>
    ) : maint.state === "due_soon" ? (
      <Badge variant="warning">Sắp bảo trì</Badge>
    ) : (
      <Badge variant="success">Ổn</Badge>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" /> Số km & bảo trì — {vehicle.plateNumber}
          </DialogTitle>
          <DialogDescription>
            Tài xế: {vehicle.driverName} • {vehicle.driverPhone}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Maintenance summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Số km tích lũy</p>
                <p className="text-2xl font-bold">{formatKm(vehicle.odometerKm)}</p>
              </div>
              <div className="text-right">{stateBadge}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Từ lần bảo trì gần nhất</span>
                <span>
                  {formatKm(maint.kmSinceMaintenance)} / {formatKm(vehicle.maintenanceIntervalKm)}
                </span>
              </div>
              <Progress
                value={Math.min(100, maint.ratio * 100)}
                indicatorClassName={barColor}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {maint.state === "overdue"
                  ? `Quá ${formatKm(-maint.kmUntilNext)} so với hạn — cần đưa vào bảo trì.`
                  : `Còn ${formatKm(maint.kmUntilNext)} đến lần bảo trì tiếp theo.`}
              </p>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={doMarkMaintained}>
                <Wrench className="h-4 w-4" /> Đánh dấu đã bảo trì
              </Button>
            </div>
          </div>

          {/* Manual update */}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Gauge className="h-4 w-4" /> Cập nhật số km thủ công
            </p>
            <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
              <div className="space-y-1.5">
                <Label>Số km mới</Label>
                <Input
                  type="number"
                  min={vehicle.odometerKm}
                  step={1}
                  value={newKm}
                  onChange={(e) => setNewKm(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Hiện tại: {formatKm(vehicle.odometerKm)}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Ghi chú</Label>
                <Input
                  placeholder="VD: Bảo trì định kỳ, thay nhớt..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={submit} disabled={newKm <= vehicle.odometerKm}>
                <CheckCircle2 className="h-4 w-4" /> Ghi nhận
              </Button>
            </div>
          </div>

          {/* History */}
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <History className="h-4 w-4" /> Lịch sử cập nhật ({vehicle.odometerHistory.length})
            </p>
            {vehicle.odometerHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">
                Chưa có lịch sử cập nhật
              </p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs">
                    <tr>
                      <th className="px-3 py-2 font-medium">Thời gian</th>
                      <th className="px-3 py-2 font-medium">Số km</th>
                      <th className="px-3 py-2 font-medium">Tăng</th>
                      <th className="px-3 py-2 font-medium">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicle.odometerHistory.map((entry) => (
                      <tr key={entry.id} className="border-t">
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {format(new Date(entry.recordedAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                        </td>
                        <td className="px-3 py-2 font-mono font-medium">
                          {formatKm(entry.km)}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {entry.addedKm > 0 ? `+${entry.addedKm.toLocaleString("vi-VN")} km` : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {entry.orderCode && (
                            <Badge variant="outline" className="mr-1 font-mono">
                              {entry.orderCode}
                            </Badge>
                          )}
                          {entry.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
