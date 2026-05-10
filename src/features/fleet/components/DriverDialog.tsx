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
import type { Driver } from "@/shared/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: Driver | null;
  defaultCarrierId?: string;
}

const LICENSE_CLASSES: Driver["licenseClass"][] = ["B2", "C", "D", "E", "FC"];

export function DriverDialog({ open, onOpenChange, driver, defaultCarrierId }: Props) {
  const carriers = useDataStore((s) => s.carriers);
  const vehicles = useDataStore((s) => s.vehicles);
  const addDriver = useDataStore((s) => s.addDriver);
  const updateDriver = useDataStore((s) => s.updateDriver);

  const isEdit = !!driver;
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseClass, setLicenseClass] = useState<Driver["licenseClass"]>("C");
  const [carrierId, setCarrierId] = useState<string>("");
  const [currentVehicleId, setCurrentVehicleId] = useState<string>("");

  useEffect(() => {
    if (open) {
      setFullName(driver?.fullName ?? "");
      setPhone(driver?.phone ?? "");
      setLicenseClass(driver?.licenseClass ?? "C");
      setCarrierId(driver?.carrierId ?? defaultCarrierId ?? carriers[0]?.id ?? "");
      setCurrentVehicleId(driver?.currentVehicleId ?? "");
    }
  }, [open, driver?.id, defaultCarrierId, carriers]);

  const vehicleOptions = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          v.carrierId === carrierId &&
          (!v.currentDriverId || v.currentDriverId === driver?.id || v.id === currentVehicleId)
      ),
    [vehicles, carrierId, driver?.id, currentVehicleId]
  );

  function submit() {
    if (!fullName.trim() || !phone.trim()) {
      toast.error("Tên và SĐT là bắt buộc");
      return;
    }
    if (!carrierId) {
      toast.error("Chọn nhà xe");
      return;
    }
    const vehicleIdValue = currentVehicleId === "" ? undefined : currentVehicleId;
    if (isEdit && driver) {
      updateDriver(driver.id, {
        fullName,
        phone,
        licenseClass,
        carrierId,
        currentVehicleId: vehicleIdValue,
      });
      toast.success(`Đã cập nhật tài xế ${fullName}`);
    } else {
      const d = addDriver({
        fullName,
        phone,
        licenseClass,
        carrierId,
        currentVehicleId: vehicleIdValue,
      });
      toast.success(`Đã thêm tài xế ${d.fullName}`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa tài xế" : "Thêm tài xế"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Họ tên *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>SĐT *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Hạng bằng *</Label>
            <Select value={licenseClass} onValueChange={(v) => setLicenseClass(v as Driver["licenseClass"])}>
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
          <div className="space-y-1.5 md:col-span-2">
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
            <Label>Xe đang gán</Label>
            <Select
              value={currentVehicleId || "NONE"}
              onValueChange={(v) => setCurrentVehicleId(v === "NONE" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chưa gán" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">— Chưa gán —</SelectItem>
                {vehicleOptions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plateNumber}
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
