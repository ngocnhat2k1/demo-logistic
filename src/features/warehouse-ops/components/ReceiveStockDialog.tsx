"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, PackagePlus } from "lucide-react";

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
import { useAuthStore } from "@/features/auth/stores/auth";
import { QuickAddProductDialog } from "@/features/products/components/QuickAddProductDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kho mặc định (kho đang chọn nếu cụ thể). */
  defaultWarehouseId?: string | null;
}

interface Line {
  productId: string;
  quantity: string;
}

export function ReceiveStockDialog({ open, onOpenChange, defaultWarehouseId }: Props) {
  const warehouses = useDataStore((s) => s.warehouses);
  const products = useDataStore((s) => s.products);
  const recordInbound = useDataStore((s) => s.recordInbound);
  const actorId = useAuthStore((s) => s.currentUser?.id ?? "system");

  const activeWarehouses = warehouses.filter((w) => w.status === "ACTIVE");
  const activeProducts = products.filter((p) => p.status === "ACTIVE");

  const [warehouseId, setWarehouseId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "" }]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWarehouseId(
      defaultWarehouseId && defaultWarehouseId !== "ALL"
        ? defaultWarehouseId
        : activeWarehouses[0]?.id ?? ""
    );
    setNote("");
    setLines([{ productId: "", quantity: "" }]);
  }, [open, defaultWarehouseId]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { productId: "", quantity: "" }]);
  }
  function removeLine(i: number) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  function submit() {
    if (!warehouseId) {
      toast.error("Vui lòng chọn kho nhập");
      return;
    }
    const parsed = lines
      .map((l) => ({ productId: l.productId, quantity: Number(l.quantity) }))
      .filter((l) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0);
    if (parsed.length === 0) {
      toast.error("Cần ít nhất 1 dòng hàng hợp lệ (chọn SKU + số lượng > 0)");
      return;
    }
    recordInbound({ warehouseId, lines: parsed, direction: "INBOUND", note: note.trim() || undefined, actorId });
    toast.success(`Đã nhập kho ${parsed.length} dòng hàng`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nhập hàng mới vào kho</DialogTitle>
          <DialogDescription>Ghi nhận hàng nhập kho theo từng SKU và số lượng.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Kho nhập *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn kho" />
                </SelectTrigger>
                <SelectContent>
                  {activeWarehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Nhập từ NCC A" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Dòng hàng</Label>
              <Button variant="ghost" size="sm" onClick={() => setQuickAddOpen(true)}>
                <PackagePlus className="h-4 w-4" /> SKU mới
              </Button>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Select value={l.productId} onValueChange={(v) => updateLine(i, { productId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn sản phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.sku} — {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28 space-y-1.5">
                  <Input
                    type="number"
                    min={1}
                    value={l.quantity}
                    onChange={(e) => updateLine(i, { quantity: e.target.value })}
                    placeholder="SL"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-destructive"
                  onClick={() => removeLine(i)}
                  disabled={lines.length === 1}
                  title="Xoá dòng"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4" /> Thêm dòng
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit}>Nhập kho</Button>
        </DialogFooter>
      </DialogContent>

      <QuickAddProductDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={(p) => {
          setLines((prev) => {
            const empty = prev.findIndex((l) => !l.productId);
            if (empty >= 0) return prev.map((l, idx) => (idx === empty ? { ...l, productId: p.id } : l));
            return [...prev, { productId: p.id, quantity: "" }];
          });
        }}
      />
    </Dialog>
  );
}
