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
import { useDataStore } from "@/shared/stores/data";
import type { Product } from "@/shared/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Gọi sau khi tạo thành công — tiện cho việc chọn ngay sản phẩm vừa thêm trong dialog nhập/xuất. */
  onCreated?: (product: Product) => void;
}

export function QuickAddProductDialog({ open, onOpenChange, onCreated }: Props) {
  const addProduct = useDataStore((s) => s.addProduct);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("thùng");
  const [unitWeightKg, setUnitWeightKg] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (!open) return;
    setSku("");
    setName("");
    setUnit("thùng");
    setUnitWeightKg("");
    setCategory("");
  }, [open]);

  function submit() {
    if (!sku.trim() || !name.trim()) {
      toast.error("Mã SKU & tên sản phẩm là bắt buộc");
      return;
    }
    const w = Number(unitWeightKg);
    if (!Number.isFinite(w) || w <= 0) {
      toast.error("Trọng lượng/đơn vị không hợp lệ");
      return;
    }
    const p = addProduct({
      sku,
      name,
      unit: unit.trim() || "cái",
      unitWeightKg: w,
      category: category.trim() || "Khác",
      status: "ACTIVE",
    });
    toast.success(`Đã thêm sản phẩm ${p.name}`);
    onCreated?.(p);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm sản phẩm / SKU</DialogTitle>
          <DialogDescription>Khai báo nhanh một mã hàng để dùng cho nhập/xuất kho.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Mã SKU *</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="VD: SKU-TD-01" />
          </div>
          <div className="space-y-1.5">
            <Label>Đơn vị</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="thùng / kg / cái" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Tên sản phẩm *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Trọng lượng/đơn vị (kg) *</Label>
            <Input
              type="number"
              value={unitWeightKg}
              onChange={(e) => setUnitWeightKg(e.target.value)}
              placeholder="VD: 25"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nhóm hàng</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="VD: Tiêu dùng" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit}>Thêm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
