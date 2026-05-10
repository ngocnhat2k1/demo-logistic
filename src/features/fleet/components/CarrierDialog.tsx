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
import type { Carrier } from "@/shared/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carrier?: Carrier | null;
  /** Initial type when creating new */
  defaultType?: Carrier["type"];
}

export function CarrierDialog({ open, onOpenChange, carrier, defaultType = "BACKUP" }: Props) {
  const addCarrier = useDataStore((s) => s.addCarrier);
  const updateCarrier = useDataStore((s) => s.updateCarrier);

  const isEdit = !!carrier;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<Carrier["type"]>(defaultType);
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    if (open) {
      setCode(carrier?.code ?? "");
      setName(carrier?.name ?? "");
      setType(carrier?.type ?? defaultType);
      setContactPhone(carrier?.contactPhone ?? "");
    }
  }, [open, carrier?.id, defaultType]);

  function submit() {
    if (!code.trim() || !name.trim()) {
      toast.error("Mã & tên nhà xe là bắt buộc");
      return;
    }
    if (isEdit && carrier) {
      updateCarrier(carrier.id, { code, name, type, contactPhone });
      toast.success(`Đã cập nhật nhà xe ${name}`);
    } else {
      const c = addCarrier({ code, name, type, contactPhone });
      toast.success(`Đã tạo nhà xe ${c.name}`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa nhà xe" : "Tạo nhà xe"}</DialogTitle>
          <DialogDescription>
            Nhà xe liên kết là đơn vị nội bộ; nhà xe dự phòng là đối tác bên thứ 3.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Mã *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: TTM" />
          </div>
          <div className="space-y-1.5">
            <Label>Loại *</Label>
            <Select value={type} onValueChange={(v) => setType(v as Carrier["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INTERNAL">Nhà xe liên kết</SelectItem>
                <SelectItem value="BACKUP">Nhà xe dự phòng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Tên công ty *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Số liên hệ</Label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
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
