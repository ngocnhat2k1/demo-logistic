"use client";

import { useState } from "react";
import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Gauge } from "lucide-react";
import { toast } from "sonner";
import { formatKm } from "@/features/fleet/utils";
import type { Vehicle } from "@/shared/types";

interface OdometerUpdateDialogProps {
  vehicle: Vehicle;
}

export function OdometerUpdateDialog({ vehicle }: OdometerUpdateDialogProps) {
  const user = useAuthStore((s) => s.currentUser);
  const recordOdometer = useDataStore((s) => s.recordOdometer);
  const [open, setOpen] = useState(false);
  const [km, setKm] = useState<number>(vehicle.odometerKm);
  const [note, setNote] = useState("");

  function reset() {
    setKm(vehicle.odometerKm);
    setNote("");
  }

  function handleSubmit() {
    if (!user) return;
    if (!Number.isFinite(km) || km < vehicle.odometerKm) {
      toast.error(
        `Số km mới (${formatKm(km)}) phải ≥ số km hiện tại (${formatKm(vehicle.odometerKm)})`
      );
      return;
    }
    const r = recordOdometer(vehicle.id, km, user.id, { note: note.trim() || undefined });
    if (!r.ok) {
      toast.error(r.reason ?? "Không thể cập nhật số km");
      return;
    }
    toast.success(`Đã cập nhật số km (+${formatKm(r.entry?.addedKm ?? 0)})`);
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Gauge className="h-4 w-4 mr-1.5" /> Cập nhật số km
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cập nhật số km xe {vehicle.plateNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            Số km hiện tại: <span className="font-mono font-semibold">{formatKm(vehicle.odometerKm)}</span>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Số km mới</label>
            <Input
              type="number"
              inputMode="numeric"
              value={km}
              onChange={(e) => setKm(Number(e.target.value))}
              min={vehicle.odometerKm}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Ghi chú (không bắt buộc)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ví dụ: chạy về kho, đổ nhiên liệu, kết thúc ca..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Cộng thêm:{" "}
            <span className="font-semibold">
              {formatKm(Math.max(0, km - vehicle.odometerKm))}
            </span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={!Number.isFinite(km) || km < vehicle.odometerKm}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
