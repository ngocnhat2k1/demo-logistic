"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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

interface TopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function TopUpDialog({ open, onOpenChange, customer }: TopUpDialogProps) {
  const topUpQuota = useDataStore((s) => s.topUpQuota);
  const user = useAuthStore((s) => s.currentUser);
  const [tons, setTons] = useState("5");

  useEffect(() => {
    if (open) setTons("5");
  }, [open]);

  if (!customer) return null;

  const isPrepaid = customer.quota.type === "PREPAID";

  function submit() {
    if (!user || !customer) return;
    if (!isPrepaid) {
      toast.error("Chỉ nạp thêm cho khách trả trước (PREPAID)");
      return;
    }
    const kg = Math.round(parseFloat(tons) * 1000);
    if (!kg || kg <= 0) {
      toast.error("Khối lượng nạp không hợp lệ");
      return;
    }
    topUpQuota(customer.id, kg, user.id, `Nạp thêm ${tons} tấn`);
    toast.success(`Đã nạp thêm ${tons} tấn cho ${customer.name}`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Nạp thêm hạn mức
          </DialogTitle>
          <DialogDescription>{customer.code} • {customer.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Hạn mức hiện tại</p>
            <p className="font-semibold">{formatKg(customer.quota.limit)}</p>
          </div>
          <div className="space-y-2">
            <Label>Khối lượng nạp thêm (tấn)</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={tons}
              onChange={(e) => setTons(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={!isPrepaid}>
            Nạp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
