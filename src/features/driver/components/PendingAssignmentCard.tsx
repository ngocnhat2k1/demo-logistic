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
import { MapPin, CheckCircle2, XCircle } from "lucide-react";
import { formatKg } from "@/shared/utils";
import { toast } from "sonner";
import type { Order, DispatchAssignment } from "@/shared/types";

interface PendingAssignmentCardProps {
  order: Order;
  assignment: DispatchAssignment;
}

export function PendingAssignmentCard({ order, assignment }: PendingAssignmentCardProps) {
  const user = useAuthStore((s) => s.currentUser);
  const customers = useDataStore((s) => s.customers);
  const acceptAssignment = useDataStore((s) => s.acceptAssignment);
  const rejectAssignment = useDataStore((s) => s.rejectAssignment);

  const [rejectOpen, setRejectOpen] = useState(false);
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

  function handleConfirmReject() {
    if (!user) return;
    const r = rejectAssignment(order.id, assignment.id, user.id, reason);
    if (!r.ok) {
      toast.error(r.reason ?? "Không thể từ chối");
      return;
    }
    toast.success(`Đã từ chối đơn ${order.code}`);
    setRejectOpen(false);
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
          <Button variant="outline" onClick={() => setRejectOpen(true)}>
            <XCircle className="h-4 w-4 mr-1" /> Từ chối
          </Button>
          <Button onClick={handleAccept}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Đồng ý
          </Button>
        </div>
      </CardContent>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối đơn {order.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Lý do từ chối <span className="text-destructive">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Ví dụ: xe gặp sự cố, không đúng tuyến đường, đã hết ca làm việc..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Lý do sẽ được gửi về điều độ để xử lý tiếp.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={!reason.trim()}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
