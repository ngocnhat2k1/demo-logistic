"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Save, AlertTriangle } from "lucide-react";

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
import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import type { Customer, QuotaType } from "@/shared/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Customer | null;
}

const QUOTA_OPTIONS: { value: QuotaType; label: string; desc: string }[] = [
  { value: "POSTPAID", label: "Thanh toán sau", desc: "Không giới hạn — tính công nợ" },
  { value: "MONTHLY", label: "Theo tháng", desc: "Giới hạn KL theo tháng — reset đầu tháng" },
  { value: "PREPAID", label: "Trả trước", desc: "Mua trước KL, dùng đến đâu trừ đến đó" },
];

export function AddCustomerDialog({ open, onOpenChange, initial }: Props) {
  const router = useRouter();
  const addCustomer = useDataStore((s) => s.addCustomer);
  const updateCustomer = useDataStore((s) => s.updateCustomer);
  const user = useAuthStore((s) => s.currentUser);
  const isEdit = !!initial;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [quotaType, setQuotaType] = useState<QuotaType>("MONTHLY");
  const [quotaTons, setQuotaTons] = useState("10");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setPhone(initial.phone);
      setEmail(initial.email ?? "");
      setAddress(initial.address);
      setTaxCode(initial.taxCode ?? "");
      setQuotaType(initial.quota.type);
      setQuotaTons(
        initial.quota.type === "POSTPAID"
          ? "0"
          : (initial.quota.limit / 1000).toString()
      );
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setTaxCode("");
      setQuotaType("MONTHLY");
      setQuotaTons("10");
    }
  }, [open, initial]);

  const typeChanged = isEdit && initial!.quota.type !== quotaType;

  function submit() {
    if (!name.trim()) {
      toast.error("Tên khách hàng không được rỗng");
      return;
    }
    if (!phone.trim()) {
      toast.error("Số điện thoại không được rỗng");
      return;
    }
    const limitKg = quotaType === "POSTPAID" ? 0 : Math.round(parseFloat(quotaTons) * 1000);
    if (quotaType !== "POSTPAID" && (!limitKg || limitKg <= 0)) {
      toast.error("Hạn mức không hợp lệ");
      return;
    }

    if (isEdit) {
      if (typeChanged) {
        const ok = confirm(
          `Đổi loại hạn mức từ ${initial!.quota.type} → ${quotaType} sẽ reset số liệu hiện tại (giữ lịch sử). Tiếp tục?`
        );
        if (!ok) return;
      }
      updateCustomer(
        initial!.id,
        {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim(),
          taxCode: taxCode.trim() || undefined,
          quotaType,
          quotaLimitKg: limitKg,
        },
        user?.id ?? "user"
      );
      toast.success(`Đã cập nhật ${initial!.code}`);
      onOpenChange(false);
      return;
    }

    const c = addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      taxCode: taxCode.trim() || undefined,
      quotaType,
      quotaLimitKg: limitKg,
    });
    toast.success(`Đã thêm khách hàng ${c.code}`);
    onOpenChange(false);
    router.push(`/customers/${c.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Sửa khách hàng ${initial!.code}` : "Thêm khách hàng"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin & hạn mức khách hàng. Lịch sử biến động được giữ lại."
              : "Mã khách hàng sẽ được tự động sinh. Hạn mức tính theo tấn hàng."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Tên khách hàng *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Công ty TNHH ABC" />
          </div>
          <div className="space-y-1.5">
            <Label>Số điện thoại *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Mã số thuế</Label>
            <Input value={taxCode} onChange={(e) => setTaxCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Địa chỉ</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>Loại hạn mức</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {QUOTA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setQuotaType(opt.value)}
                  className={`rounded-md border p-3 text-left text-sm transition ${
                    quotaType === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-input hover:border-muted-foreground/50"
                  }`}
                >
                  <p className="font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            {typeChanged && (
              <div className="flex items-start gap-2 rounded-md border border-warning bg-warning/5 p-2 text-xs text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Đổi loại hạn mức sẽ reset <strong>reserved/used/outstanding</strong> về 0 (lịch sử
                  vẫn được giữ).
                </span>
              </div>
            )}
          </div>

          {quotaType !== "POSTPAID" && (
            <div className="space-y-1.5 md:col-span-2">
              <Label>
                Hạn mức ({quotaType === "MONTHLY" ? "tấn / tháng" : "tấn còn lại"}) *
              </Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={quotaTons}
                onChange={(e) => setQuotaTons(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={submit}>
            {isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? "Lưu thay đổi" : "Thêm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
