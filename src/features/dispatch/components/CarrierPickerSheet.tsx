"use client";

import { useEffect, useMemo } from "react";
import { Building2, ShieldAlert, Truck, X, ArrowRight, Phone, Package } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useDataStore } from "@/shared/stores/data";
import { cn, formatKg } from "@/shared/utils";
import type { Carrier, Order } from "@/shared/types";

interface Props {
  order: Order | null;
  onClose: () => void;
  onPickCarrier: (carrier: Carrier) => void;
}

/**
 * Step 1 dispatcher flow: chọn Nhà cung cấp (NCC) cho đơn trước khi chọn xe.
 * - Internal (liên kết) → parent mở MobileAssignSheet với filter theo carrier
 * - Backup (dự phòng) → parent submit đơn lên giám sát duyệt
 */
export function CarrierPickerSheet({ order, onClose, onPickCarrier }: Props) {
  const carriers = useDataStore((s) => s.carriers);
  const vehicles = useDataStore((s) => s.vehicles);
  const customers = useDataStore((s) => s.customers);
  const open = !!order;

  const carriersWithStats = useMemo(() => {
    const fitWeight = order?.weightKg ?? 0;
    return carriers.map((c) => {
      const carrierVehicles = vehicles.filter((v) => v.carrierId === c.id);
      const available = carrierVehicles.filter((v) => v.status === "AVAILABLE");
      const fit = available.filter((v) => v.capacityKg >= fitWeight);
      return { carrier: c, totalVehicles: carrierVehicles.length, available: available.length, fit: fit.length };
    });
  }, [carriers, vehicles, order]);

  const internal = useMemo(
    () => carriersWithStats.filter((x) => x.carrier.type === "INTERNAL"),
    [carriersWithStats],
  );
  const backup = useMemo(
    () => carriersWithStats.filter((x) => x.carrier.type === "BACKUP"),
    [carriersWithStats],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const customer = order ? customers.find((c) => c.id === order.customerId) : null;

  return (
    <div
      className={cn("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 max-h-[88vh] flex flex-col rounded-t-2xl bg-card shadow-2xl border-t transition-transform duration-200 ease-out",
          "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[85vh] md:w-full md:max-w-xl md:-translate-x-1/2 md:rounded-2xl md:border",
          open
            ? "translate-y-0 md:-translate-y-1/2 md:opacity-100"
            : "translate-y-full md:translate-y-[calc(-50%+1rem)] md:opacity-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Chọn nhà cung cấp"
      >
        <div className="flex justify-center pt-2 pb-1 shrink-0 md:hidden">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-start gap-2 px-4 pb-3 border-b shrink-0 md:px-6 md:py-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Bước 1 / 2 • Chọn nhà cung cấp cho đơn</p>
            <p className="font-mono font-semibold text-primary">{order?.code}</p>
            {customer && <p className="text-sm font-medium truncate">{customer.name}</p>}
            {order && (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {formatKg(order.weightKg)}
                </span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng" className="shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-5 md:px-6 md:py-5">
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Nhà cung cấp liên kết</h3>
              <Badge variant="secondary" className="text-[10px]">{internal.length}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              Sau khi chọn sẽ chuyển thẳng sang bước chọn xe.
            </p>
            {internal.length === 0 ? (
              <EmptyHint label="Chưa có NCC liên kết nào." />
            ) : (
              <div className="space-y-2">
                {internal.map((item) => (
                  <CarrierCard
                    key={item.carrier.id}
                    item={item}
                    accentClass="border-primary/40 hover:border-primary"
                    badgeText="Liên kết"
                    badgeVariant="default"
                    onClick={() => onPickCarrier(item.carrier)}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <h3 className="font-semibold text-sm">Nhà xe dự phòng</h3>
              <Badge variant="warning" className="text-[10px]">{backup.length}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              Đơn sẽ chuyển sang trạng thái <b>“Chờ giám sát duyệt”</b> trước khi được phân xe.
            </p>
            {backup.length === 0 ? (
              <EmptyHint label="Chưa có nhà xe dự phòng nào." />
            ) : (
              <div className="space-y-2">
                {backup.map((item) => (
                  <CarrierCard
                    key={item.carrier.id}
                    item={item}
                    accentClass="border-amber-300/60 hover:border-amber-500"
                    badgeText="Dự phòng • Cần duyệt"
                    badgeVariant="warning"
                    onClick={() => onPickCarrier(item.carrier)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function CarrierCard({
  item,
  accentClass,
  badgeText,
  badgeVariant,
  onClick,
}: {
  item: { carrier: Carrier; totalVehicles: number; available: number; fit: number };
  accentClass: string;
  badgeText: string;
  badgeVariant: "default" | "warning";
  onClick: () => void;
}) {
  const { carrier, totalVehicles, available, fit } = item;
  const disabled = available === 0;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left rounded-lg border-2 p-3 transition active:bg-primary/5",
        disabled ? "opacity-50 cursor-not-allowed" : accentClass,
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="font-semibold text-sm">{carrier.name}</p>
          <p className="text-[11px] text-muted-foreground font-mono">{carrier.code}</p>
        </div>
        <Badge variant={badgeVariant} className="text-[10px] shrink-0">
          {badgeText}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Truck className="h-3 w-3" /> {available}/{totalVehicles} xe sẵn sàng
        </span>
        <span className="inline-flex items-center gap-1">
          <Package className="h-3 w-3" /> {fit} xe đủ tải
        </span>
        <span className="inline-flex items-center gap-1">
          <Phone className="h-3 w-3" /> {carrier.contactPhone}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-xs font-medium text-primary">
        Chọn NCC này <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}
