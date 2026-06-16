"use client";

import { useState } from "react";
import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { MapPin, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatKg } from "@/shared/utils";
import { toast } from "sonner";
import type { Order, DispatchAssignment } from "@/shared/types";

interface PendingAssignmentCardProps {
  order: Order;
  assignment: DispatchAssignment;
}

const WARNING_PRESETS = [
  "Xe gặp sự cố kỹ thuật",
  "Không đúng tuyến đường / quá xa",
  "Đã hết ca làm việc",
  "Hàng vượt quá khả năng chở",
];

export function PendingAssignmentCard({ order, assignment }: PendingAssignmentCardProps) {
  const user = useAuthStore((s) => s.currentUser);
  const customers = useDataStore((s) => s.customers);
  const acceptAssignment = useDataStore((s) => s.acceptAssignment);
  const raiseDispatchWarning = useDataStore((s) => s.raiseDispatchWarning);

  const [warnOpen, setWarnOpen] = useState(false);
  const [reason, setReason] = useState("");
  const customer = customers.find((c) => c.id === order.customerId);

  function handleAccept() {
    if (!user) return;
    const r = acceptAssignment(order.id, assignment.id, user.id);
    if (!r.ok) {
      toast.error(r.reason ?? "Không thể đồng ý phân công");
      return;
    }
    toast.success(`Đã nhận đơn ${order.code}`);
  }

  function handleConfirmWarning() {
    if (!user) return;
    const r = raiseDispatchWarning(order.id, assignment.id, user.id, reason);
    if (!r.ok) {
      toast.error(r.reason ?? "Không thể gửi cảnh báo");
      return;
    }
    toast.success(
      r.mode === "AUTO"
        ? `Đã gửi cảnh báo — hệ thống đã phân lại xe cho đơn ${order.code}`
        : `Đã gửi cảnh báo đơn ${order.code} — điều độ sẽ phân lại xe`
    );
    setWarnOpen(false);
    setReason("");
  }

  return (
    <Card className="border-warning border-2">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono font-semibold text-primary">{order.code}</p>
          <span className="rounded-full bg-warning/15 text-warning text-[11px] px-2 py-0.5 font-medium">
            Chờ xác nhận
          </span>
        </div>
        <p className="font-semibold text-base">{customer?.name ?? "—"}</p>
        <div className="space-y-1 text-sm">
          <p className="flex items-start gap-1.5">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-success" />
            <span className="flex-1">{order.pickup.address}</span>
          </p>
          <p className="flex items-start gap-1.5">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
            <span className="flex-1">{order.dropoff.address}</span>
          </p>
        </div>
        <p className="text-sm font-semibold">{formatKg(assignment.weightKg)}</p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            variant="outline"
            className="border-warning text-warning hover:bg-warning/10"
            onClick={() => setWarnOpen(true)}
          >
            <AlertTriangle className="h-4 w-4 mr-1" /> Cảnh báo
          </Button>
          <Button onClick={handleAccept}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Đồng ý
          </Button>
        </div>
      </CardContent>

      <Dialog open={warnOpen} onOpenChange={setWarnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cảnh báo sự cố đơn {order.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Bạn không thể từ chối đơn. Hãy báo sự cố — hệ thống sẽ tự động phân lại xe khác
              hoặc chuyển điều độ xử lý.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {WARNING_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReason(p)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    reason === p
                      ? "border-warning bg-warning/10 text-warning"
                      : "border-input text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <label className="text-sm font-medium">
              Lý do cảnh báo <span className="text-destructive">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Ví dụ: xe gặp sự cố, không đúng tuyến đường, đã hết ca làm việc..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarnOpen(false)}>
              Huỷ
            </Button>
            <Button variant="warning" onClick={handleConfirmWarning} disabled={!reason.trim()}>
              <AlertTriangle className="h-4 w-4 mr-1" /> Gửi cảnh báo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
