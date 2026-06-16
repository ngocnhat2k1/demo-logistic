"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input, Label, Textarea } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useDataStore } from "@/shared/stores/data";
import { useUIStore } from "@/shared/stores/ui";
import { useAuthStore } from "@/features/auth/stores/auth";
import { checkQuota, quotaInUse, quotaLabel } from "@/features/orders/domain/quota";
import { formatKg } from "@/shared/utils";
import { PLACES, type PlaceKey } from "@/shared/mock/geo";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenImport?: () => void;
}

export function CreateOrderDialog({ open, onOpenChange, onOpenImport }: Props) {
  const router = useRouter();
  const customers = useDataStore((s) => s.customers);
  const warehouses = useDataStore((s) => s.warehouses);
  const createOrder = useDataStore((s) => s.createOrder);
  const pushNotification = useDataStore((s) => s.pushNotification);
  const currentWarehouseId = useUIStore((s) => s.currentWarehouseId);
  const user = useAuthStore((s) => s.currentUser);

  const activeWarehouses = warehouses.filter((w) => w.status === "ACTIVE");

  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [dropoffKey, setDropoffKey] = useState<PlaceKey>("BD_DI_AN");

  // Mặc định kho xuất = kho đang chọn (nếu cụ thể), ngược lại để trống → bắt chọn (mode "Tất cả kho").
  useEffect(() => {
    if (!open) return;
    const def =
      currentWarehouseId && currentWarehouseId !== "ALL" ? currentWarehouseId : "";
    setWarehouseId((prev) => prev || def);
  }, [open, currentWarehouseId]);
  const [weightKg, setWeightKg] = useState<number>(500);
  const [description, setDescription] = useState("Hàng tiêu dùng");
  const [notes, setNotes] = useState("");
  const [requestedDeliveryAt, setRequestedDeliveryAt] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [override, setOverride] = useState(false);

  const customer = customers.find((c) => c.id === customerId);
  const quotaCheck = customer ? checkQuota(customer, weightKg) : null;
  const canManagerOverride =
    user?.role === "ADMIN" || user?.role === "OPS_MANAGER";

  function resetForm() {
    setCustomerId("");
    setWarehouseId("");
    setDropoffKey("BD_DI_AN");
    setWeightKg(500);
    setDescription("Hàng tiêu dùng");
    setNotes("");
    setRequestedDeliveryAt(
      new Date(Date.now() + 86400000).toISOString().slice(0, 16)
    );
    setOverride(false);
  }

  function handleOpenChange(val: boolean) {
    if (!val) resetForm();
    onOpenChange(val);
  }

  function submit() {
    if (!customer) {
      toast.error("Vui lòng chọn khách hàng");
      return;
    }
    if (!quotaCheck?.ok && !override) {
      toast.error(quotaCheck?.reason || "Vượt hạn mức");
      return;
    }
    const wh = activeWarehouses.find((w) => w.id === warehouseId);
    if (!wh) {
      toast.error("Vui lòng chọn kho xuất hàng");
      return;
    }
    const dropoff = PLACES[dropoffKey];
    const o = createOrder({
      customerId: customer.id,
      warehouseId: wh.id,
      pickup: {
        address: wh.location.address,
        lat: wh.location.lat,
        lng: wh.location.lng,
        contactName: wh.contactName ?? "Kho",
        contactPhone: wh.contactPhone ?? "0900000000",
      },
      dropoff: {
        address: dropoff.name,
        lat: dropoff.lat,
        lng: dropoff.lng,
        contactName: customer.name,
        contactPhone: customer.phone,
      },
      weightKg,
      description,
      notes,
      requestedDeliveryAt: new Date(requestedDeliveryAt).toISOString(),
      source: "MANUAL",
      status: "PENDING_DISPATCH",
    });
    if (override) {
      pushNotification({
        type: "GENERIC",
        severity: "warning",
        title: "Override hạn mức",
        message: `${user?.fullName} đã override hạn mức KH ${customer.name} cho đơn ${o.code}`,
      });
    }
    toast.success(`Đã tạo đơn ${o.code}`);
    handleOpenChange(false);
    router.push(`/orders/${o.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo đơn hàng</DialogTitle>
          <DialogDescription>
            Hoặc{" "}
            <button
              className="text-primary hover:underline text-sm"
              onClick={() => { handleOpenChange(false); onOpenImport?.(); }}
            >
              import từ Excel
            </button>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              toast.info("OCR demo: Mock fill form từ ảnh đơn", {
                description: "Đã điền thử dữ liệu mẫu",
              })
            }
          >
            <Camera className="h-4 w-4" /> Quét đơn từ ảnh (OCR demo)
          </Button>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Khách hàng *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Khối lượng (kg) *</Label>
              <Input
                type="number"
                min={1}
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kho xuất hàng *</Label>
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
              <Label>Điểm giao *</Label>
              <Select
                value={dropoffKey}
                onValueChange={(v) => setDropoffKey(v as PlaceKey)}
              >
                <SelectTrigger>
                  <SelectValue />
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

            <div className="space-y-1.5 md:col-span-2">
              <Label>Mô tả hàng</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Thời gian giao mong muốn</Label>
              <Input
                type="datetime-local"
                value={requestedDeliveryAt}
                onChange={(e) => setRequestedDeliveryAt(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Ghi chú</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {customer && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">Hạn mức: {quotaLabel(customer.quota)}</span>
                {customer.quota.type === "POSTPAID" ? (
                  <span className="text-muted-foreground">
                    Công nợ: {formatKg(customer.quota.outstanding ?? 0)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Đã dùng {formatKg(quotaInUse(customer.quota))} / {formatKg(customer.quota.limit)}
                    {(customer.quota.reserved ?? 0) > 0 && (
                      <> · giữ chỗ {formatKg(customer.quota.reserved ?? 0)}</>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          {quotaCheck && quotaCheck.level !== "ok" && (
            <div
              className={`flex items-start gap-3 rounded-md border p-3 text-sm ${
                quotaCheck.level === "block"
                  ? "border-destructive bg-destructive/5 text-destructive"
                  : "border-warning bg-warning/5 text-warning"
              }`}
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">
                  {quotaCheck.level === "block"
                    ? "Vượt hạn mức — không thể tạo đơn"
                    : "Cảnh báo: gần đầy hạn mức"}
                </p>
                <p className="text-xs">{quotaCheck.reason}</p>
                {quotaCheck.level === "block" && canManagerOverride && (
                  <label className="mt-2 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={override}
                      onChange={(e) => setOverride(e.target.checked)}
                    />
                    <span className="text-xs font-medium">
                      Override (Manager+) — sẽ được ghi log
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Huỷ
            </Button>
            <Button
              onClick={submit}
              disabled={!customerId || !warehouseId || (!quotaCheck?.ok && !override)}
            >
              <Plus className="h-4 w-4" /> Tạo đơn
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
