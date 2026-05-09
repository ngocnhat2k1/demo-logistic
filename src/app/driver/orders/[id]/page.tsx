"use client";

import { useDataStore } from "@/lib/stores/data";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { ArrowLeft, MapPin, Package, Truck, CheckCircle2, XCircle, Camera, PenLine } from "lucide-react";
import { formatKg } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReturnReason } from "@/types";

const REASON_LABEL: Record<ReturnReason, string> = {
  CUSTOMER_REJECTED: "KH từ chối nhận",
  NO_CONTACT: "Không liên lạc được KH",
  WRONG_ADDRESS: "Sai địa chỉ",
  DAMAGED_GOODS: "Hàng hư hỏng",
  CUSTOMER_REQUEST: "KH yêu cầu trả",
  VEHICLE_BREAKDOWN: "Xe gặp sự cố",
};

export default function DriverOrderPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const order = useDataStore((s) => s.orders.find((o) => o.id === id));
  const setOrderStatus = useDataStore((s) => s.setOrderStatus);
  const completeDelivery = useDataStore((s) => s.completeDelivery);
  const reportDeliveryFailure = useDataStore((s) => s.reportDeliveryFailure);
  const pushNotification = useDataStore((s) => s.pushNotification);
  const customers = useDataStore((s) => s.customers);
  const user = useAuthStore((s) => s.currentUser);

  const [failOpen, setFailOpen] = useState(false);
  const [failReason, setFailReason] = useState<ReturnReason>("CUSTOMER_REJECTED");
  const [failNotes, setFailNotes] = useState("");

  const [completeOpen, setCompleteOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const sigRef = useRef<HTMLCanvasElement | null>(null);

  if (!order) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /> Quay lại</Button>
        <p className="mt-4 text-muted-foreground">Không tìm thấy đơn</p>
      </div>
    );
  }

  const customer = customers.find((c) => c.id === order.customerId);

  function pickedUp() {
    if (!user || !order) return;
    setOrderStatus(order.id, "PICKED_UP", user.id);
    pushNotification({
      type: "GENERIC",
      severity: "info",
      title: "Tài xế đã lấy hàng",
      message: `${order.code} đã pickup`,
      targetRoles: ["DISPATCHER"],
    });
    toast.success("Đã xác nhận lấy hàng");
  }

  function inTransit() {
    if (!user || !order) return;
    setOrderStatus(order.id, "IN_TRANSIT", user.id);
    toast.success("Đang trên đường giao");
  }

  function complete() {
    if (!user || !order) return;
    const sig = signature || sigRef.current?.toDataURL("image/png");
    completeDelivery(order.id, sig, [], user.id);
    pushNotification({
      type: "ORDER_DELIVERED",
      severity: "success",
      title: "Đơn đã giao thành công",
      message: `${order.code} - ${customer?.name}`,
      targetRoles: ["DISPATCHER", "SALES", "OPS_MANAGER"],
    });
    toast.success(`Đã giao đơn ${order.code}`);
    setCompleteOpen(false);
    router.push("/driver");
  }

  function reportFail() {
    if (!user || !order) return;
    reportDeliveryFailure(order.id, failReason, failNotes, [], user.id);
    pushNotification({
      type: "ORDER_FAILED",
      severity: "destructive",
      title: "Giao thất bại",
      message: `${order.code}: ${REASON_LABEL[failReason]}`,
      targetRoles: ["DISPATCHER", "OPS_MANAGER"],
    });
    toast.error(`Báo giao thất bại: ${REASON_LABEL[failReason]}`);
    setFailOpen(false);
    router.push("/driver");
  }

  // Signature canvas
  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = sigRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const rect = c.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    c.setPointerCapture(e.pointerId);
  }
  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.buttons === 0) return;
    const c = sigRef.current!;
    const ctx = c.getContext("2d")!;
    const rect = c.getBoundingClientRect();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }
  function clearSig() {
    const c = sigRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setSignature(null);
  }

  return (
    <div className="p-4 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push("/driver")}>
        <ArrowLeft className="h-4 w-4" /> Trang chủ
      </Button>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-mono font-bold text-lg text-primary">{order.code}</p>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-lg font-semibold">{customer?.name}</p>

          <div className="rounded-md border bg-muted/40 p-3 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Lấy hàng</p>
                <p className="font-medium">{order.pickup.address}</p>
                {order.pickup.contactPhone && <a href={`tel:${order.pickup.contactPhone}`} className="text-xs text-primary">{order.pickup.contactPhone}</a>}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Giao hàng</p>
                <p className="font-medium">{order.dropoff.address}</p>
                {order.dropoff.contactPhone && <a href={`tel:${order.dropoff.contactPhone}`} className="text-xs text-primary">{order.dropoff.contactPhone}</a>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Khối lượng</p>
              <p className="text-lg font-bold flex items-center gap-1"><Package className="h-4 w-4" /> {formatKg(order.weightKg)}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Mặt hàng</p>
              <p className="font-medium">{order.description}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            {order.status === "DISPATCHED" && (
              <Button size="xl" className="w-full" onClick={pickedUp}>
                <Truck className="h-5 w-5" /> Đã lấy hàng tại kho
              </Button>
            )}
            {order.status === "PICKED_UP" && (
              <Button size="xl" className="w-full" onClick={inTransit}>
                <Truck className="h-5 w-5" /> Bắt đầu giao hàng
              </Button>
            )}
            {(order.status === "IN_TRANSIT" || order.status === "PICKED_UP") && (
              <>
                <Button size="xl" variant="success" className="w-full" onClick={() => setCompleteOpen(true)}>
                  <CheckCircle2 className="h-5 w-5" /> Đã giao thành công
                </Button>
                <Button size="xl" variant="destructive" className="w-full" onClick={() => setFailOpen(true)}>
                  <XCircle className="h-5 w-5" /> Báo giao thất bại
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Failure dialog */}
      <Dialog open={failOpen} onOpenChange={setFailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Báo giao thất bại</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Lý do</label>
              <Select value={failReason} onValueChange={(v) => setFailReason(v as ReturnReason)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(REASON_LABEL) as ReturnReason[]).map((r) => (
                    <SelectItem key={r} value={r}>{REASON_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ghi chú</label>
              <Textarea value={failNotes} onChange={(e) => setFailNotes(e.target.value)} placeholder="Mô tả tình hình..." />
            </div>
            <Button variant="outline" size="sm" className="w-full" disabled>
              <Camera className="h-4 w-4" /> Chụp ảnh hiện trường (mock)
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailOpen(false)}>Huỷ</Button>
            <Button variant="destructive" onClick={reportFail}>Xác nhận thất bại</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận giao hàng</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2"><PenLine className="h-4 w-4" /> Chữ ký người nhận</p>
            <canvas
              ref={sigRef}
              width={420}
              height={150}
              className="rounded-md border bg-white touch-none w-full"
              onPointerDown={startDraw}
              onPointerMove={draw}
            />
            <Button variant="outline" size="sm" onClick={clearSig}>Xoá chữ ký</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>Huỷ</Button>
            <Button variant="success" onClick={complete}>Hoàn thành</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
