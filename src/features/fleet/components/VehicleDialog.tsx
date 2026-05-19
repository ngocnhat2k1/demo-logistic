"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import type { Vehicle, VehicleType, LicenseClass } from "@/shared/types";

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

const LICENSE_CLASSES: LicenseClass[] = ["B2", "C", "D", "E", "FC"];

const DEFAULT_INTERVAL = 10000;

export function VehicleDialog({ open, onOpenChange, vehicle, defaultCarrierId }: Props) {
  const carriers = useDataStore((s) => s.carriers);
  const addVehicle = useDataStore((s) => s.addVehicle);
  const updateVehicle = useDataStore((s) => s.updateVehicle);

  const isEdit = !!vehicle;

  const [plateNumber, setPlateNumber] = useState("");
  const [capacityKg, setCapacityKg] = useState<number>(2000);
  const [type, setType] = useState<VehicleType>("BOX");
  const [carrierId, setCarrierId] = useState<string>("");

  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverLicenseClass, setDriverLicenseClass] = useState<LicenseClass>("C");

  const [odometerKm, setOdometerKm] = useState<number>(0);
  const [maintenanceIntervalKm, setMaintenanceIntervalKm] = useState<number>(DEFAULT_INTERVAL);

  useEffect(() => {
    if (!open) return;
    setPlateNumber(vehicle?.plateNumber ?? "");
    setCapacityKg(vehicle?.capacityKg ?? 2000);
    setType(vehicle?.type ?? "BOX");
    setCarrierId(vehicle?.carrierId ?? defaultCarrierId ?? carriers[0]?.id ?? "");
    setDriverName(vehicle?.driverName ?? "");
    setDriverPhone(vehicle?.driverPhone ?? "");
    setDriverLicenseClass(vehicle?.driverLicenseClass ?? "C");
    setOdometerKm(vehicle?.odometerKm ?? 0);
    setMaintenanceIntervalKm(vehicle?.maintenanceIntervalKm ?? DEFAULT_INTERVAL);
  }, [open, vehicle?.id, defaultCarrierId, carriers]);

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
    if (!driverName.trim() || !driverPhone.trim()) {
      toast.error("Tên và SĐT tài xế là bắt buộc");
      return;
    }
    if (!Number.isFinite(maintenanceIntervalKm) || maintenanceIntervalKm <= 0) {
      toast.error("Chu kỳ bảo trì phải > 0");
      return;
    }

    if (isEdit && vehicle) {
      updateVehicle(vehicle.id, {
        plateNumber,
        capacityKg,
        type,
        carrierId,
        driverName,
        driverPhone,
        driverLicenseClass,
        maintenanceIntervalKm,
      });
      toast.success(`Đã cập nhật xe ${plateNumber}`);
    } else {
      const v = addVehicle({
        plateNumber,
        capacityKg,
        type,
        carrierId,
        driverName,
        driverPhone,
        driverLicenseClass,
        odometerKm,
        maintenanceIntervalKm,
      });
      toast.success(`Đã thêm xe ${v.plateNumber} (${v.driverName})`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa xe & tài xế" : "Thêm xe & tài xế"}</DialogTitle>
          <DialogDescription>
            Mỗi xe gắn cố định 1 tài xế. Nhập thông tin xe và tài xế cùng lúc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Thông tin xe
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Biển số *</Label>
                <Input
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  placeholder="51C-12345"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tải trọng (kg) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={capacityKg}
                  onChange={(e) => setCapacityKg(Number(e.target.value))}
                />
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
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tài xế phụ trách
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Họ tên tài xế *</Label>
                <Input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="space-y-1.5">
                <Label>SĐT *</Label>
                <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hạng bằng *</Label>
                <Select
                  value={driverLicenseClass}
                  onValueChange={(v) => setDriverLicenseClass(v as LicenseClass)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LICENSE_CLASSES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Bảo trì
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {!isEdit && (
                <div className="space-y-1.5">
                  <Label>Số km hiện tại</Label>
                  <Input
                    type="number"
                    min={0}
                    value={odometerKm}
                    onChange={(e) => setOdometerKm(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Số km đồng hồ xe lúc đưa vào sử dụng
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Chu kỳ bảo trì (km) *</Label>
                <Input
                  type="number"
                  min={1000}
                  step={500}
                  value={maintenanceIntervalKm}
                  onChange={(e) => setMaintenanceIntervalKm(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Mặc định 10.000 km giữa các lần bảo trì
                </p>
              </div>
            </div>
            {isEdit && vehicle && (
              <p className="text-xs text-muted-foreground">
                Số km hiện tại: <span className="font-semibold">{vehicle.odometerKm.toLocaleString("vi-VN")} km</span>
                {" "}— cập nhật qua mục &ldquo;Lịch sử ODO&rdquo; ở danh sách xe.
              </p>
            )}
          </section>
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
