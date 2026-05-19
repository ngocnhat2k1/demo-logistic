"use client";

import { useEffect, useMemo } from "react";
import { Sparkles, Truck, X, MapPin, Package, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { suggestVehicles } from "@/features/dispatch/domain/dispatchHeuristic";
import { useDataStore } from "@/shared/stores/data";
import { formatKg, cn } from "@/shared/utils";
import type { Order, Vehicle } from "@/shared/types";

interface Props {
  order: Order | null;
  onClose: () => void;
  onPickVehicle: (vehicle: Vehicle) => void;
}

/**
 * Bottom-sheet bottom-up modal for mobile dispatch assignment.
 * - Lists AI suggested vehicles (top 3) with score + reasons
 * - Lists all remaining available vehicles compactly
 * - Tap vehicle → calls onPickVehicle (parent opens AcceptDispatchDialog)
 */
export function MobileAssignSheet({ order, onClose, onPickVehicle }: Props) {
  const vehicles = useDataStore((s) => s.vehicles);
  const customers = useDataStore((s) => s.customers);
  const open = !!order;

  const suggestions = useMemo(
    () => (order ? suggestVehicles({ order, vehicles }) : []),
    [order, vehicles],
  );
  const suggestedIds = useMemo(() => new Set(suggestions.map((s) => s.vehicleId)), [suggestions]);

  const otherAvailable = useMemo(
    () =>
      vehicles
        .filter((v) => v.status === "AVAILABLE" && !suggestedIds.has(v.id))
        .filter((v) => !order || v.capacityKg >= order.weightKg)
        .sort((a, b) => a.capacityKg - b.capacityKg),
    [vehicles, suggestedIds, order],
  );

  const tooSmall = useMemo(
    () =>
      order
        ? vehicles
            .filter((v) => v.status === "AVAILABLE")
            .filter((v) => v.capacityKg < order.weightKg).length
        : 0,
    [vehicles, order],
  );

  // Lock body scroll
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

  // Close on Escape
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
      className={cn(
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      {/* Sheet — bottom sheet on mobile, centered modal on md+ */}
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
        aria-label="Phân xe cho đơn"
      >
        {/* Drag handle visual (mobile only) */}
        <div className="flex justify-center pt-2 pb-1 shrink-0 md:hidden">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-2 px-4 pb-3 border-b shrink-0 md:px-6 md:py-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Phân xe cho đơn</p>
            <p className="font-mono font-semibold text-primary">{order?.code}</p>
            {customer && (
              <p className="text-sm font-medium truncate">{customer.name}</p>
            )}
            {order && (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {formatKg(order.weightKg)}
                </span>
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{order.dropoff.address}</span>
                </span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng" className="shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 md:px-6 md:py-5 md:space-y-5">
          {/* AI Suggestions */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">AI gợi ý xe phù hợp</h3>
              <Badge variant="secondary" className="text-[10px]">
                Top {suggestions.length}
              </Badge>
            </div>
            {suggestions.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                Không có xe khả dụng phù hợp tải trọng đơn.
                {tooSmall > 0 && (
                  <p className="mt-1 text-xs">
                    {tooSmall} xe còn rảnh nhưng tải trọng nhỏ hơn yêu cầu.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions.map((s, idx) => {
                  const v = vehicles.find((x) => x.id === s.vehicleId)!;
                  return (
                    <button
                      key={s.vehicleId}
                      onClick={() => onPickVehicle(v)}
                      className="w-full text-left rounded-lg border-2 p-3 hover:border-primary active:bg-primary/5 transition"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                            #{idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono font-semibold">{v.plateNumber}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {v.driverName} • {formatKg(v.capacityKg)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-primary leading-none">{s.score}</p>
                          <p className="text-[9px] text-muted-foreground uppercase">/ 100</p>
                        </div>
                      </div>
                      <ul className="text-[11px] text-muted-foreground space-y-0.5 pl-10">
                        {s.reasons.slice(0, 2).map((r, i) => (
                          <li key={i} className="truncate">• {r}</li>
                        ))}
                      </ul>
                      <div className="mt-2 flex items-center justify-end gap-1 text-xs font-medium text-primary">
                        Chọn xe này <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Other vehicles */}
          {otherAvailable.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Xe khả dụng khác</h3>
                <Badge variant="secondary" className="text-[10px]">
                  {otherAvailable.length}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {otherAvailable.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onPickVehicle(v)}
                    className="w-full text-left rounded-md border p-2.5 hover:border-primary active:bg-primary/5 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono font-semibold text-sm">{v.plateNumber}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {v.driverName} • {v.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px]">
                          {formatKg(v.capacityKg)}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
