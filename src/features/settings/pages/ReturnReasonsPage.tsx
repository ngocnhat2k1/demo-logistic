"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input, Label } from "@/shared/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/shared/ui/dialog";
import { useDataStore } from "@/shared/stores/data";
import type { ReturnReasonCategory, ReturnReasonConfig } from "@/shared/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PERCENT_OPTIONS = [0, 25, 50, 75, 100];

export default function ReturnReasonsPage() {
  const reasons = useDataStore((s) => s.returnReasons);
  const addReturnReason = useDataStore((s) => s.addReturnReason);
  const updateReturnReason = useDataStore((s) => s.updateReturnReason);
  const toggleReturnReason = useDataStore((s) => s.toggleReturnReason);
  const deleteReturnReason = useDataStore((s) => s.deleteReturnReason);

  const [editing, setEditing] = useState<ReturnReasonConfig | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <Topbar title="Cấu hình lý do trả hàng" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lý do trả hàng</CardTitle>
                <CardDescription>
                  Lý do được phân loại <strong>Bất khả kháng</strong> (FORCE_MAJEURE — không trừ hạn mức) hoặc{" "}
                  <strong>Chủ quan KH</strong> (CUSTOMER_FAULT — trừ hạn mức). Mỗi lý do có thể tinh chỉnh
                  % hoàn riêng.
                </CardDescription>
              </div>
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Thêm lý do
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Tên lý do</th>
                  <th className="px-4 py-3 font-medium">Phân loại</th>
                  <th className="px-4 py-3 font-medium">% hoàn HM</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium">Loại</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {reasons.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{r.label}</td>
                    <td className="px-4 py-3">
                      <Badge variant={r.category === "FORCE_MAJEURE" ? "success" : "warning"}>
                        {r.category === "FORCE_MAJEURE" ? "Bất khả kháng" : "Chủ quan KH"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{r.refundPercent}%</td>
                    <td className="px-4 py-3">
                      <button
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.active
                            ? "bg-success text-success-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                        onClick={() => toggleReturnReason(r.id)}
                      >
                        {r.active ? "Đang dùng" : "Đã tắt"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.isBuiltIn ? "Mặc định" : "Tùy chỉnh"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!r.isBuiltIn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Xóa lý do "${r.label}"?`)) {
                                deleteReturnReason(r.id);
                                toast.success("Đã xóa lý do");
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <ReasonDialog
        open={!!editing || creating}
        initial={editing}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        onSave={(data) => {
          if (editing) {
            updateReturnReason(editing.id, data);
            toast.success("Đã cập nhật lý do");
          } else {
            addReturnReason({
              code: `CUSTOM_${Date.now().toString(36).toUpperCase()}`,
              ...data,
            });
            toast.success("Đã thêm lý do mới");
          }
          setEditing(null);
          setCreating(false);
        }}
      />
    </>
  );
}

function ReasonDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: ReturnReasonConfig | null;
  onClose: () => void;
  onSave: (data: {
    label: string;
    category: ReturnReasonCategory;
    refundPercent: number;
    active: boolean;
  }) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [category, setCategory] = useState<ReturnReasonCategory>(initial?.category ?? "CUSTOMER_FAULT");
  const [refundPercent, setRefundPercent] = useState<number>(initial?.refundPercent ?? 0);
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  useEffect(() => {
    if (open) {
      setLabel(initial?.label ?? "");
      setCategory(initial?.category ?? "CUSTOMER_FAULT");
      setRefundPercent(initial?.refundPercent ?? 0);
      setActive(initial?.active ?? true);
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa lý do" : "Thêm lý do trả hàng"}</DialogTitle>
          <DialogDescription>
            Lý do <strong>Bất khả kháng</strong> không trừ hạn mức khách (mặc định 100% hoàn).
            <br />
            Lý do <strong>Chủ quan KH</strong> trừ hạn mức (mặc định 0% hoàn).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tên lý do *</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="VD: Khách đổi ý" />
          </div>
          <div className="space-y-1.5">
            <Label>Phân loại</Label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-md border p-2 text-sm ${category === "FORCE_MAJEURE" ? "border-success bg-success/10 font-semibold" : "border-input"}`}
                onClick={() => setCategory("FORCE_MAJEURE")}
              >
                Bất khả kháng
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md border p-2 text-sm ${category === "CUSTOMER_FAULT" ? "border-warning bg-warning/10 font-semibold" : "border-input"}`}
                onClick={() => setCategory("CUSTOMER_FAULT")}
              >
                Chủ quan KH
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>% hoàn hạn mức: {refundPercent}%</Label>
            <div className="flex gap-2">
              {PERCENT_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`flex-1 rounded-md border py-2 text-sm ${refundPercent === p ? "border-primary bg-primary/10 font-semibold" : "border-input"}`}
                  onClick={() => setRefundPercent(p)}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Đang dùng (hiện trong dropdown khi tạo đơn trả)</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={() => {
              if (!label.trim()) {
                toast.error("Tên lý do không được rỗng");
                return;
              }
              onSave({ label: label.trim(), category, refundPercent, active });
            }}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
