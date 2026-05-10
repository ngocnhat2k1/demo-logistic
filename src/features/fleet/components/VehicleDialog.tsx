"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input, Label } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useDataStore } from "@/shared/stores/data";
import type { Vehicle, VehicleType } from "@/shared/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle | null;
  defaultCarrierId?: string;
}

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "BOX", label: "Thùng kín" },
  { value: "TANK", label: "Bồn" },
  { value: "CONTAINER", label: "Container" },
  { value: "FLATBED", label: "Thùng hở" },
];

export function VehicleDialog({ open, onOpenChange, vehicle, defaultCarrierId }: Props) {
  const carriers = useDataStore((s) => s.carriers);
  const drivers = useDataStore((s) => s.drivers);
  const addVehicle = useDataStore((s) => s.addVehicle);
  const updateVehicle = useDataStore((s) => s.updateVehicle);

  const isEdit = !!vehicle;
  const [plateNumber, setPlateNumber] = useState("");
  const [capacityKg, setCapacityKg] = useState<number>(2000);
  const [type, setType] = useState<VehicleType>("BOX");
  const [carrierId, setCarrierId] = useState<string>("");
  const [currentDriverId, setCurrentDriverId] = useState<string>("");

  useEffect(() => {
    if (open) {
      setPlateNumber(vehicle?.plateNumber ?? "");
      setCapacityKg(vehicle?.capacityKg ?? 2000);
      setType(vehicle?.type ?? "BOX");
      setCarrierId(vehicle?.carrierId ?? defaultCarrierId ?? carriers[0]?.id ?? "");
      setCurrentDriverId(vehicle?.currentDriverId ?? "");
    }
  }, [open, vehicle?.id, defaultCarrierId, carriers]);

  // Driver list for the chosen carrier
  const driverOptions = useMemo(
    () =>
      drivers.filter(
        (d) =>
          d.carrierId === carrierId &&
          (!d.currentVehicleId || d.currentVehicleId === vehicle?.id || d.id === currentDriverId)
      ),
    [drivers, carrierId, vehicle?.id, currentDriverId]
  );

  function submit() {
    if (!plateNumber.trim()) {
      toast.error("Biển số là bắt buộc");
      return;
    }
    if (!carrierId) {
      toast.error("Chọn nhà xe");
      return;
    }
    if (!Number.isFinite(capacityKg) || capacityKg <= 0) {
      toast.error("Tải trọng phải > 0");
      return;
    }
    const driverIdValue = currentDriverId === "" ? undefined : currentDriverId;
    if (isEdit && vehicle) {
      updateVehicle(vehicle.id, {
        plateNumber,
        capacityKg,
        type,
        carrierId,
        currentDriverId: driverIdValue,
      });
      toast.success(`Đã cập nhật xe ${plateNumber}`);
    } else {
      const v = addVehicle({
        plateNumber,
        capacityKg,
        type,
        carrierId,
        currentDriverId: driverIdValue,
      });
      toast.success(`Đã thêm xe ${v.plateNumber}`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa xe" : "Thêm xe"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Biển số *</Label>
            <Input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="51C-12345" />
          </div>
          <div className="space-y-1.5">
            <Label>Tải trọng (kg) *</Label>
            <Input type="number" min={1} value={capacityKg} onChange={(e) => setCapacityKg(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Loại xe *</Label>
            <Select value={type} onValueChange={(v) => setType(v as VehicleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nhà xe *</Label>
            <Select value={carrierId} onValueChange={setCarrierId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn nhà xe" />
              </SelectTrigger>
              <SelectContent>
                {carriers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.name} ({c.type === "INTERNAL" ? "liên kết" : "dự phòng"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Tài xế</Label>
            <Select value={currentDriverId || "NONE"} onValueChange={(v) => setCurrentDriverId(v === "NONE" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Chưa gán" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">— Chưa gán —</SelectItem>
                {driverOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.fullName} ({d.licenseClass})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit}>{isEdit ? "Lưu" : "Thêm"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
