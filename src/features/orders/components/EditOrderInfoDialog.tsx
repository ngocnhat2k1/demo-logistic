"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { useAuthStore } from "@/features/auth/stores/auth";
import { checkQuota } from "@/features/orders/domain/quota";
import { PLACES, type PlaceKey } from "@/shared/mock/geo";
import type { Order } from "@/shared/types";

interface Props {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function findPlaceKey(address: string, lat: number, lng: number): PlaceKey | "" {
  const keys = Object.keys(PLACES) as PlaceKey[];
  return (
    keys.find(
      (k) =>
        PLACES[k].name === address ||
        (Math.abs(PLACES[k].lat - lat) < 0.001 && Math.abs(PLACES[k].lng - lng) < 0.001)
    ) ?? ""
  );
}

export function EditOrderInfoDialog({ order, open, onOpenChange }: Props) {
  const updateOrderInfo = useDataStore((s) => s.updateOrderInfo);
  const customers = useDataStore((s) => s.customers);
  const user = useAuthStore((s) => s.currentUser);

  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [requestedDeliveryAt, setRequestedDeliveryAt] = useState("");
  const [extraCostNote, setExtraCostNote] = useState("");
  const [pickupKey, setPickupKey] = useState<PlaceKey | "">("");
  const [dropoffKey, setDropoffKey] = useState<PlaceKey | "">("");
  const [weightKg, setWeightKg] = useState<number>(0);

  useEffect(() => {
    if (order && open) {
      setDescription(order.description ?? "");
      setNotes(order.notes ?? "");
      setRequestedDeliveryAt(toLocalInput(order.requestedDeliveryAt));
      setExtraCostNote(order.extraCostNote ?? "");
      setPickupKey(findPlaceKey(order.pickup.address, order.pickup.lat, order.pickup.lng));
      setDropoffKey(findPlaceKey(order.dropoff.address, order.dropoff.lat, order.dropoff.lng));
      setWeightKg(order.weightKg);
    }
  }, [order?.id, open]);

  const customer = useMemo(
    () => (order ? customers.find((c) => c.id === order.customerId) : null),
    [order, customers]
  );

  const weightChanged = order ? Math.abs(weightKg - order.weightKg) > 0.0001 : false;
  const diff = order ? weightKg - order.weightKg : 0;
  // Re-check quota only on the *delta* (existing reservation already covers original)
  const quotaCheck = useMemo(() => {
    if (!customer || !weightChanged || diff <= 0) return null;
    return checkQuota(customer, diff);
  }, [customer, diff, weightChanged]);

  const pickupChanged = !!order && pickupKey !== "" && PLACES[pickupKey as PlaceKey].name !== order.pickup.address;
  const dropoffChanged = !!order && dropoffKey !== "" && PLACES[dropoffKey as PlaceKey].name !== order.dropoff.address;
  const willReDispatch =
    !!order && order.assignments.length > 0 && (pickupChanged || dropoffChanged || weightChanged);

  if (!order) return null;

  function submit() {
    if (!user || !order) return;
    if (weightKg <= 0) {
      toast.error("Khối lượng phải > 0");
      return;
    }
    if (quotaCheck && quotaCheck.level === "block") {
      toast.error(quotaCheck.reason || "Tăng khối lượng vượt hạn mức");
      return;
    }
    updateOrderInfo(
      order.id,
      {
        description,
        notes,
        requestedDeliveryAt: requestedDeliveryAt
          ? new Date(requestedDeliveryAt).toISOString()
          : undefined,
        extraCostNote,
        pickup: pickupKey
          ? {
              address: PLACES[pickupKey as PlaceKey].name,
              lat: PLACES[pickupKey as PlaceKey].lat,
              lng: PLACES[pickupKey as PlaceKey].lng,
              contactName: order.pickup.contactName,
              contactPhone: order.pickup.contactPhone,
            }
          : undefined,
        dropoff: dropoffKey
          ? {
              address: PLACES[dropoffKey as PlaceKey].name,
              lat: PLACES[dropoffKey as PlaceKey].lat,
              lng: PLACES[dropoffKey as PlaceKey].lng,
              contactName: order.dropoff.contactName,
              contactPhone: order.dropoff.contactPhone,
            }
          : undefined,
        weightKg,
      },
      user.id
    );
    toast.success(
      willReDispatch
        ? `Đã cập nhật ${order.code} — vui lòng điều phối lại`
        : `Đã cập nhật thông tin đơn ${order.code}`
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cập nhật thông tin đơn {order.code}</DialogTitle>
          <DialogDescription>
            Có thể đổi địa điểm, thời gian và khối lượng khi đơn chưa giao thành công. Hệ thống sẽ
            re-check hạn mức và bỏ phân xe để re-dispatch nếu cần.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Điểm lấy hàng</Label>
              <Select value={pickupKey} onValueChange={(v) => setPickupKey(v as PlaceKey)}>
                <SelectTrigger>
                  <SelectValue placeholder={order.pickup.address} />
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

            <div className="space-y-1.5">
              <Label>Điểm giao</Label>
              <Select value={dropoffKey} onValueChange={(v) => setDropoffKey(v as PlaceKey)}>
                <SelectTrigger>
                  <SelectValue placeholder={order.dropoff.address} />
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

            <div className="space-y-1.5">
              <Label>Khối lượng (kg)</Label>
              <Input
                type="number"
                min={1}
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Thời gian giao mong muốn</Label>
              <Input
                type="datetime-local"
                value={requestedDeliveryAt}
                onChange={(e) => setRequestedDeliveryAt(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Mô tả hàng</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Ghi chú</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Ghi chú chi phí phát sinh</Label>
              <Textarea
                value={extraCostNote}
                onChange={(e) => setExtraCostNote(e.target.value)}
                rows={2}
                placeholder="Có thể để trống"
              />
            </div>
          </div>

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
                    ? "Tăng khối lượng vượt hạn mức"
                    : "Cảnh báo: gần đầy hạn mức"}
                </p>
                <p className="text-xs">{quotaCheck.reason}</p>
              </div>
            </div>
          )}

          {willReDispatch && (
            <div className="flex items-start gap-3 rounded-md border border-warning bg-warning/5 p-3 text-sm text-warning">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Đơn này đã được phân xe</p>
                <p className="text-xs">
                  Khi lưu thay đổi, hệ thống sẽ tự động bỏ phân xe ({order.assignments.length} xe)
                  và đưa đơn về trạng thái <b>Chờ điều phối</b> để re-dispatch.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={quotaCheck?.level === "block"}>
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
