"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, PackagePlus, Printer, AlertTriangle } from "lucide-react";

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
import { getWarehouseStock } from "@/features/warehouses/domain/inventory";
import { QuickAddProductDialog } from "@/features/products/components/QuickAddProductDialog";
import { IssueNotePrint } from "@/features/warehouse-ops/components/IssueNotePrint";

interface Line {
  productId: string;
  quantity: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWarehouseId?: string | null;
  /** Dòng hàng nạp sẵn (vd: import từ Excel). */
  initialLines?: Line[] | null;
  initialNote?: string;
}

export function IssueStockDialog({ open, onOpenChange, defaultWarehouseId, initialLines, initialNote }: Props) {
  const warehouses = useDataStore((s) => s.warehouses);
  const products = useDataStore((s) => s.products);
  const stockMovements = useDataStore((s) => s.stockMovements);
  const recordManualOutbound = useDataStore((s) => s.recordManualOutbound);
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
    setNote(initialNote ?? "");
    setLines(initialLines && initialLines.length ? initialLines : [{ productId: "", quantity: "" }]);
  }, [open, defaultWarehouseId, initialLines, initialNote]);

  const stock = useMemo(
    () => (warehouseId ? getWarehouseStock(stockMovements, warehouseId) : {}),
    [stockMovements, warehouseId]
  );

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { productId: "", quantity: "" }]);
  }
  function removeLine(i: number) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  const parsed = lines
    .map((l) => ({ productId: l.productId, quantity: Number(l.quantity) }))
    .filter((l) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0);

  // Cảnh báo nếu xuất quá tồn hiện có.
  const overdraft = parsed.filter((l) => l.quantity > (stock[l.productId] ?? 0));

  function submit() {
    if (!warehouseId) {
      toast.error("Vui lòng chọn kho xuất");
      return;
    }
    if (parsed.length === 0) {
      toast.error("Cần ít nhất 1 dòng hàng hợp lệ (chọn SKU + số lượng > 0)");
      return;
    }
    const res = recordManualOutbound({ warehouseId, lines: parsed, note: note.trim() || undefined, actorId });
    if (!res.ok) {
      toast.error(res.reason ?? "Không thể tạo phiếu xuất");
      return;
    }
    toast.success(`Đã tạo phiếu xuất kho ${parsed.length} dòng hàng — tồn kho đã trừ`);
    if (overdraft.length > 0) {
      toast.warning(`${overdraft.length} mã xuất vượt tồn — tồn kho âm, vui lòng kiểm tra`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo phiếu xuất kho</DialogTitle>
          <DialogDescription>Xuất hàng khỏi kho theo SKU (xuất bán / chuyển kho / xuất khác).</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Kho xuất *</Label>
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
              <Label>Lý do / Nơi nhận</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Xuất bán cho KH A" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Dòng hàng</Label>
              <Button variant="ghost" size="sm" onClick={() => setQuickAddOpen(true)}>
                <PackagePlus className="h-4 w-4" /> SKU mới
              </Button>
            </div>
            {lines.map((l, i) => {
              const available = l.productId ? stock[l.productId] ?? 0 : null;
              const qtyN = Number(l.quantity);
              const over = l.productId && Number.isFinite(qtyN) && qtyN > 0 && qtyN > (available ?? 0);
              return (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
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
                    {available != null && (
                      <p className={`text-[11px] ${over ? "text-destructive" : "text-muted-foreground"}`}>
                        Tồn hiện có: {available}
                        {over ? " — không đủ!" : ""}
                      </p>
                    )}
                  </div>
                  <div className="w-24">
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
              );
            })}
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4" /> Thêm dòng
            </Button>
          </div>

          {overdraft.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-warning bg-warning/5 p-3 text-xs text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Có {overdraft.length} dòng xuất vượt tồn hiện có — tồn kho sẽ âm sau khi xuất.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button variant="outline" onClick={() => window.print()} disabled={parsed.length === 0}>
            <Printer className="h-4 w-4" /> In phiếu
          </Button>
          <Button onClick={submit} disabled={parsed.length === 0}>
            Xác nhận xuất kho
          </Button>
        </DialogFooter>
      </DialogContent>

      <QuickAddProductDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={(p) => {
          setLines((prev) => {
            const emptyIdx = prev.findIndex((l) => !l.productId);
            if (emptyIdx >= 0) return prev.map((l, idx) => (idx === emptyIdx ? { ...l, productId: p.id } : l));
            return [...prev, { productId: p.id, quantity: "" }];
          });
        }}
      />

      <IssueNotePrint
        warehouseId={warehouseId}
        lines={parsed}
        note={note.trim() || undefined}
      />
    </Dialog>
  );
}
