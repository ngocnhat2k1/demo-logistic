"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Input, Label } from "@/shared/ui/input";
import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { formatKg } from "@/shared/utils";
import type { Customer } from "@/shared/types";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function PaymentDialog({ open, onOpenChange, customer }: PaymentDialogProps) {
  const recordPayment = useDataStore((s) => s.recordPayment);
  const user = useAuthStore((s) => s.currentUser);
  const [tons, setTons] = useState("0");

  useEffect(() => {
    if (open) setTons("0");
  }, [open]);

  if (!customer) return null;

  const outstanding = customer.quota.outstanding ?? 0;
  const isPostpaid = customer.quota.type === "POSTPAID";

  function submit() {
    if (!user || !customer) return;
    if (!isPostpaid) {
      toast.error("Chỉ ghi nhận thanh toán cho khách POSTPAID");
      return;
    }
    const kg = Math.round(parseFloat(tons) * 1000);
    if (!kg || kg <= 0) {
      toast.error("Khối lượng thanh toán không hợp lệ");
      return;
    }
    if (kg > outstanding) {
      toast.error(`Vượt quá công nợ hiện tại (${formatKg(outstanding)})`);
      return;
    }
    recordPayment(customer.id, kg, user.id, `Ghi nhận thanh toán ${tons} tấn`);
    toast.success(`Đã ghi nhận thanh toán ${tons} tấn cho ${customer.name}`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Ghi nhận thanh toán
          </DialogTitle>
          <DialogDescription>{customer.code} • {customer.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Công nợ hiện tại</p>
            <p className="font-semibold">{formatKg(outstanding)}</p>
          </div>
          <div className="space-y-2">
            <Label>Khối lượng đã thanh toán (tấn)</Label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={tons}
              onChange={(e) => setTons(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={!isPostpaid || outstanding <= 0}>
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
