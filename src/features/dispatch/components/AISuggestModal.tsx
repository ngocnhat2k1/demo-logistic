"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Sparkles, Truck, CheckCircle2, ShieldAlert, Building2 } from "lucide-react";
import { suggestVehicles } from "@/features/dispatch/domain/dispatchHeuristic";
import { useDataStore } from "@/shared/stores/data";
import type { Order } from "@/shared/types";
import { useAuthStore } from "@/features/auth/stores/auth";
import { toast } from "sonner";

interface Props {
  order: Order | null;
  open: boolean;
  onClose: () => void;
}

export function AISuggestModal({ order, open, onClose }: Props) {
  const vehicles = useDataStore((s) => s.vehicles);
  const carriers = useDataStore((s) => s.carriers);
  const assign = useDataStore((s) => s.assignOrderToVehicle);
  const submitOrderCarrier = useDataStore((s) => s.submitOrderCarrier);
  const pushNotification = useDataStore((s) => s.pushNotification);
  const user = useAuthStore((s) => s.currentUser);

  const suggestions = order ? suggestVehicles({ order, vehicles }) : [];

  function pick(vehicleId: string) {
    if (!order || !user) return;
    const v = vehicles.find((x) => x.id === vehicleId);
    if (!v) return;
    const carrier = carriers.find((c) => c.id === v.carrierId);

    // Set carrier first (also gates BACKUP into supervisor review).
    if (carrier) {
      const res = submitOrderCarrier(order.id, carrier.id, user.id);
      if (!res.ok) {
        toast.error(res.reason || "Không chọn được NCC");
        return;
      }
      if (res.needsReview) {
        toast.success(`Đã gửi ${order.code} (NCC dự phòng ${carrier.name}) lên giám sát duyệt`);
        onClose();
        return;
      }
    }

    const a = assign(order.id, vehicleId, user.id);
    if (!a) {
      toast.error("Không thể phân xe (kiểm tra tải trọng/tài xế)");
      return;
    }
    pushNotification({
      type: "ORDER_DISPATCHED",
      severity: "info",
      title: "Đã phân xe",
      message: `Đơn ${order.code} → xe ${v.plateNumber} (AI gợi ý)`,
      targetRoles: ["DRIVER", "DISPATCHER"],
    });
    toast.success(`AI gợi ý: phân ${order.code} cho xe ${v.plateNumber}`);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Gợi ý xe
          </DialogTitle>
          <DialogDescription>
            {order ? `Top ${suggestions.length} xe phù hợp cho đơn ${order.code} (${order.weightKg.toLocaleString()}kg)` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {suggestions.length === 0 && (
            <p className="text-sm text-muted-foreground">Không có xe nào phù hợp tại thời điểm này.</p>
          )}
          {suggestions.map((s, idx) => {
            const v = vehicles.find((x) => x.id === s.vehicleId);
            const carrier = v ? carriers.find((c) => c.id === v.carrierId) : null;
            const isBackup = carrier?.type === "BACKUP";
            return (
              <div
                key={s.vehicleId}
                className="rounded-lg border p-4 hover:border-primary transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-semibold">
                          #{idx + 1} • {v?.plateNumber}
                        </p>
                        {carrier && (
                          <Badge
                            variant={isBackup ? "warning" : "default"}
                            className="text-[10px] inline-flex items-center gap-1"
                          >
                            <Building2 className="h-3 w-3" />
                            {isBackup ? "Dự phòng" : "Liên kết"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {v?.type} • {v?.capacityKg.toLocaleString()}kg
                        {carrier && <> • NCC {carrier.name}</>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{s.score}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">/ 100</p>
                  </div>
                </div>
                {isBackup && (
                  <p className="mb-2 flex items-start gap-1.5 text-[11px] text-warning">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Chọn xe này sẽ gửi đơn lên giám sát khu vực duyệt trước khi phân.
                  </p>
                )}
                <ul className="space-y-1 text-xs text-muted-foreground mb-3">
                  {s.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                <Button size="sm" className="w-full" onClick={() => pick(s.vehicleId)}>
                  {isBackup ? "Gửi duyệt với xe này" : "Chọn xe này"}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
