"use client";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input, Label, Textarea } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useDataStore } from "@/shared/stores/data";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, AlertTriangle, Camera } from "lucide-react";
import { checkQuota } from "@/features/orders/domain/quota";
import { toast } from "sonner";
import Link from "next/link";
import { useAuthStore } from "@/features/auth/stores/auth";
import { PLACES, type PlaceKey } from "@/shared/mock/geo";

export default function OrderNewPage() {
  const router = useRouter();
  const customers = useDataStore((s) => s.customers);
  const createOrder = useDataStore((s) => s.createOrder);
  const pushNotification = useDataStore((s) => s.pushNotification);
  const user = useAuthStore((s) => s.currentUser);

  const [customerId, setCustomerId] = useState("");
  const [pickupKey, setPickupKey] = useState<PlaceKey>("HCM_KHO_TAN_BINH");
  const [dropoffKey, setDropoffKey] = useState<PlaceKey>("BD_DI_AN");
  const [weightKg, setWeightKg] = useState<number>(500);
  const [description, setDescription] = useState("Hàng tiêu dùng");
  const [notes, setNotes] = useState("");
  const [requestedDeliveryAt, setRequestedDeliveryAt] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [override, setOverride] = useState(false);

  const customer = customers.find((c) => c.id === customerId);
  const quotaCheck = customer ? checkQuota(customer, weightKg) : null;
  const canManagerOverride = user?.role === "ADMIN" || user?.role === "OPS_MANAGER";

  function submit() {
    if (!customer) {
      toast.error("Vui lòng chọn khách hàng");
      return;
    }
    if (!quotaCheck?.ok && !override) {
      toast.error(quotaCheck?.reason || "Vượt hạn mức");
      return;
    }
    const pickup = PLACES[pickupKey];
    const dropoff = PLACES[dropoffKey];
    const o = createOrder({
      customerId: customer.id,
      pickup: { address: pickup.name, lat: pickup.lat, lng: pickup.lng, contactName: "Kho", contactPhone: "0900000000" },
      dropoff: { address: dropoff.name, lat: dropoff.lat, lng: dropoff.lng, contactName: customer.name, contactPhone: customer.phone },
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
    router.push(`/orders/${o.id}`);
  }

  return (
    <>
      <Topbar title="Tạo đơn hàng" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin đơn</CardTitle>
            <CardDescription>
              Có thể{" "}
              <Link href="/orders/import" className="text-primary hover:underline">
                import từ Excel
              </Link>{" "}
              hoặc{" "}
              <Link href="/integrations/cyber" className="text-primary hover:underline">
                pull từ Cyber
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full" onClick={() => toast.info("OCR demo: Mock fill form từ ảnh đơn", { description: "Đã điền thử dữ liệu mẫu" })}>
              <Camera className="h-4 w-4" /> Quét đơn từ ảnh (OCR demo)
            </Button>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Khách hàng *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Chọn khách hàng" /></SelectTrigger>
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
                <Input type="number" min={1} value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} />
              </div>

              <div className="space-y-1.5">
                <Label>Điểm lấy hàng *</Label>
                <Select value={pickupKey} onValueChange={(v) => setPickupKey(v as PlaceKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PLACES) as PlaceKey[]).map((k) => (
                      <SelectItem key={k} value={k}>{PLACES[k].name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Điểm giao *</Label>
                <Select value={dropoffKey} onValueChange={(v) => setDropoffKey(v as PlaceKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PLACES) as PlaceKey[]).map((k) => (
                      <SelectItem key={k} value={k}>{PLACES[k].name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>Mô tả hàng</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>Thời gian giao mong muốn</Label>
                <Input type="datetime-local" value={requestedDeliveryAt} onChange={(e) => setRequestedDeliveryAt(e.target.value)} />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>Ghi chú</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
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
                    {quotaCheck.level === "block" ? "Vượt hạn mức — không thể tạo đơn" : "Cảnh báo: gần đầy hạn mức"}
                  </p>
                  <p className="text-xs">{quotaCheck.reason}</p>
                  {quotaCheck.level === "block" && canManagerOverride && (
                    <label className="mt-2 flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
                      <span className="text-xs font-medium">Override (Manager+) — sẽ được ghi log</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => router.back()}>Huỷ</Button>
              <Button onClick={submit} disabled={!customerId || (!quotaCheck?.ok && !override)}>Tạo đơn</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
