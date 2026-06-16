"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Building2, MapPin, Package, ShieldCheck, Truck, UserCircle2, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label, Textarea } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { cn, formatKg } from "@/shared/utils";
import { suggestVehicles } from "@/features/dispatch/domain/dispatchHeuristic";
import type { Order } from "@/shared/types";

interface Props {
  order: Order | null;
  onClose: () => void;
}

export function SupervisorReviewDialog({ order, onClose }: Props) {
  const carriers = useDataStore((s) => s.carriers);
  const vehicles = useDataStore((s) => s.vehicles);
  const customers = useDataStore((s) => s.customers);
  const warehouses = useDataStore((s) => s.warehouses);
  const users = useDataStore((s) => s.users);
  const approveSupervisorReview = useDataStore((s) => s.approveSupervisorReview);
  const rejectSupervisorReview = useDataStore((s) => s.rejectSupervisorReview);
  const user = useAuthStore((s) => s.currentUser);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const customer = useMemo(
    () => (order ? customers.find((c) => c.id === order.customerId) : null),
    [order, customers],
  );
  const carrier = useMemo(
    () => (order?.carrierId ? carriers.find((c) => c.id === order.carrierId) : null),
    [order, carriers],
  );
  const requester = useMemo(
    () => (order?.supervisorReview ? users.find((u) => u.id === order.supervisorReview!.requestedBy) : null),
    [order, users],
  );

  const carrierVehicles = useMemo(
    () =>
      carrier
        ? vehicles.filter(
            (v) =>
              v.carrierId === carrier.id &&
              v.status === "AVAILABLE" &&
              (order ? v.capacityKg >= order.weightKg : true),
          )
        : [],
    [carrier, vehicles, order],
  );

  const suggestedIds = useMemo(() => {
    if (!order || carrierVehicles.length === 0) return new Set<string>();
    const warehouse = warehouses.find((w) => w.id === order.warehouseId) ?? null;
    const top = suggestVehicles({ order, vehicles: carrierVehicles, warehouse });
    return new Set(top.map((s) => s.vehicleId));
  }, [order, carrierVehicles, warehouses]);

  if (!order) return null;

  const canDecide = user?.role === "ADMIN" || user?.role === "OPS_MANAGER";

  function handleApprove() {
    if (!user || !order || !selectedVehicleId) return;
    const res = approveSupervisorReview(order.id, selectedVehicleId, user.id);
    if (!res.ok) {
      toast.error(res.reason || "Không duyệt được");
      return;
    }
    const v = vehicles.find((x) => x.id === selectedVehicleId);
    toast.success(`Đã duyệt và phân ${order.code} cho ${v?.plateNumber ?? "xe"}`);
    onClose();
  }

  function handleReject() {
    if (!user || !order) return;
    const res = rejectSupervisorReview(order.id, user.id, rejectReason);
    if (!res.ok) {
      toast.error(res.reason || "Không từ chối được");
      return;
    }
    toast.success(`Đã từ chối ${order.code}. Đơn quay về danh sách chờ phân.`);
    setRejectOpen(false);
    setRejectReason("");
    onClose();
  }

  const requestedAt = order.supervisorReview?.requestedAt
    ? new Date(order.supervisorReview.requestedAt).toLocaleString("vi-VN")
    : "—";

  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-warning" /> Duyệt nhà xe dự phòng — {order.code}
          </DialogTitle>
          <DialogDescription>
            Giám sát khu vực xem xét đơn dùng NCC dự phòng và chọn xe luôn nếu đồng ý.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <section className="rounded-md border bg-muted/30 p-3 text-xs space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{customer?.name ?? "—"}</p>
                <p className="text-muted-foreground truncate">
                  <MapPin className="inline h-3 w-3" /> {order.dropoff.address}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                <Package className="h-3 w-3 mr-1" /> {formatKg(order.weightKg)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span>NCC:</span>
                <span className="font-medium text-foreground">{carrier?.name ?? "—"}</span>
                <Badge variant="warning" className="text-[9px] ml-1">Dự phòng</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <UserCircle2 className="h-3 w-3" />
                <span>Yêu cầu bởi:</span>
                <span className="font-medium text-foreground truncate">{requester?.fullName ?? "—"}</span>
              </div>
              <div className="text-muted-foreground col-span-2">Thời gian gửi: {requestedAt}</div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Truck className="h-4 w-4" /> Xe khả dụng thuộc NCC
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                {carrierVehicles.length} xe
              </Badge>
            </div>
            {carrierVehicles.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground flex flex-col items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Không có xe nào sẵn sàng & đủ tải cho NCC này.
              </div>
            ) : (
              <div className="space-y-1.5">
                {carrierVehicles.map((v) => {
                  const isSelected = v.id === selectedVehicleId;
                  const isSuggested = suggestedIds.has(v.id);
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVehicleId(v.id)}
                      className={cn(
                        "w-full text-left rounded-md border-2 p-2.5 transition",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-card hover:border-primary/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-semibold text-sm">{v.plateNumber}</p>
                            {isSuggested && (
                              <Badge variant="default" className="text-[9px]">AI gợi ý</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {v.driverName} • {v.type}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {formatKg(v.capacityKg)}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button
            variant="outline"
            className="text-destructive border-destructive/40 hover:bg-destructive/5"
            onClick={() => setRejectOpen(true)}
            disabled={!canDecide}
          >
            <X className="h-4 w-4 mr-1" /> Từ chối
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button
              onClick={handleApprove}
              disabled={!canDecide || !selectedVehicleId || carrierVehicles.length === 0}
            >
              <ShieldCheck className="h-4 w-4 mr-1" /> Duyệt & phân xe
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <Dialog open={rejectOpen} onOpenChange={(v) => !v && setRejectOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối đơn {order.code}</DialogTitle>
            <DialogDescription>
              Đơn sẽ quay về trạng thái “Chờ điều phối” và xoá NCC đã chọn. Dispatcher có thể chọn lại NCC khác.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Lý do (tuỳ chọn)</Label>
            <Textarea
              rows={3}
              placeholder="VD: Khu vực này có NCC liên kết khả dụng, hãy ưu tiên dùng NCC liên kết."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Huỷ
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
