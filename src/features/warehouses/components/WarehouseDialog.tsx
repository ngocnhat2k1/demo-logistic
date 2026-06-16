"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useDataStore } from "@/shared/stores/data";
import { PLACES, type PlaceKey } from "@/shared/mock/geo";
import type { Warehouse, WarehouseType, WarehouseStatus } from "@/shared/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse | null;
}

const TYPE_LABEL: Record<WarehouseType, string> = {
  MAIN: "Kho tổng (MAIN)",
  SATELLITE: "Kho vệ tinh (SATELLITE)",
  TRANSIT: "Kho trung chuyển (TRANSIT)",
};

export function WarehouseDialog({ open, onOpenChange, warehouse }: Props) {
  const addWarehouse = useDataStore((s) => s.addWarehouse);
  const updateWarehouse = useDataStore((s) => s.updateWarehouse);

  const isEdit = !!warehouse;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<WarehouseType>("SATELLITE");
  const [status, setStatus] = useState<WarehouseStatus>("ACTIVE");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [capacityKg, setCapacityKg] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [operatingHours, setOperatingHours] = useState("");

  useEffect(() => {
    if (!open) return;
    setCode(warehouse?.code ?? "");
    setName(warehouse?.name ?? "");
    setType(warehouse?.type ?? "SATELLITE");
    setStatus(warehouse?.status ?? "ACTIVE");
    setAddress(warehouse?.location.address ?? "");
    setLat(warehouse ? String(warehouse.location.lat) : "");
    setLng(warehouse ? String(warehouse.location.lng) : "");
    setCapacityKg(warehouse?.capacityKg != null ? String(warehouse.capacityKg) : "");
    setContactName(warehouse?.contactName ?? "");
    setContactPhone(warehouse?.contactPhone ?? "");
    setOperatingHours(warehouse?.operatingHours ?? "");
  }, [open, warehouse?.id]);

  function prefillFromPlace(key: PlaceKey) {
    const p = PLACES[key];
    setAddress(p.name);
    setLat(String(p.lat));
    setLng(String(p.lng));
  }

  function submit() {
    if (!code.trim() || !name.trim()) {
      toast.error("Mã & tên kho là bắt buộc");
      return;
    }
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!address.trim() || !Number.isFinite(latN) || !Number.isFinite(lngN)) {
      toast.error("Địa chỉ + toạ độ (lat/lng) là bắt buộc");
      return;
    }
    const capN = capacityKg.trim() ? Number(capacityKg) : undefined;
    if (capN !== undefined && (!Number.isFinite(capN) || capN < 0)) {
      toast.error("Sức chứa không hợp lệ");
      return;
    }
    const payload = {
      code,
      name,
      type,
      status,
      location: {
        address: address.trim(),
        lat: latN,
        lng: lngN,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      },
      capacityKg: capN,
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      operatingHours: operatingHours.trim() || undefined,
    };
    if (isEdit && warehouse) {
      updateWarehouse(warehouse.id, payload);
      toast.success(`Đã cập nhật kho ${name}`);
    } else {
      const w = addWarehouse(payload);
      toast.success(`Đã tạo kho ${w.name}`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa kho hàng" : "Tạo kho hàng"}</DialogTitle>
          <DialogDescription>
            Cấu hình thông tin kho: mã, vị trí, sức chứa và liên hệ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Thông tin cơ bản
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mã kho *</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: KHO-TB" />
              </div>
              <div className="space-y-1.5">
                <Label>Tên kho *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kho Tân Bình" />
              </div>
              <div className="space-y-1.5">
                <Label>Loại kho</Label>
                <Select value={type} onValueChange={(v) => setType(v as WarehouseType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABEL) as WarehouseType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as WarehouseStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                    <SelectItem value="INACTIVE">Ngừng hoạt động</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Vị trí
              </p>
              <Select onValueChange={(v) => prefillFromPlace(v as PlaceKey)}>
                <SelectTrigger className="h-8 w-auto text-xs">
                  <SelectValue placeholder="Điền nhanh từ địa điểm" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PLACES) as PlaceKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {PLACES[k].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Địa chỉ *</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Vĩ độ (lat) *</Label>
                <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="10.8011" />
              </div>
              <div className="space-y-1.5">
                <Label>Kinh độ (lng) *</Label>
                <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="106.6529" />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sức chứa & liên hệ
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Sức chứa (kg)</Label>
                <Input
                  type="number"
                  value={capacityKg}
                  onChange={(e) => setCapacityKg(e.target.value)}
                  placeholder="VD: 200000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Giờ hoạt động</Label>
                <Input
                  value={operatingHours}
                  onChange={(e) => setOperatingHours(e.target.value)}
                  placeholder="07:00 - 19:00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Người liên hệ</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Số điện thoại</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit}>{isEdit ? "Lưu" : "Tạo"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
