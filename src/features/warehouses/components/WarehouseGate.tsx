"use client";

import { useEffect } from "react";
import { Warehouse as WarehouseIcon, Globe, MapPin } from "lucide-react";

import { useDataStore } from "@/shared/stores/data";
import { useUIStore } from "@/shared/stores/ui";
import { useAuthStore } from "@/features/auth/stores/auth";
import { Card, CardContent } from "@/shared/ui/card";

function canSeeAll(role?: string) {
  return role === "ADMIN" || role === "OPS_MANAGER";
}

/**
 * Chặn app admin cho tới khi người dùng chọn kho làm việc.
 * - ADMIN/OPS_MANAGER: chọn 1 kho hoặc "Tất cả kho".
 * - DISPATCHER: auto-select kho được gán (user.warehouseId), vẫn đổi được qua switcher.
 * - Vai trò khác (SALES): chọn 1 kho cụ thể (không có "Tất cả kho").
 */
export function WarehouseGate({ children }: { children: React.ReactNode }) {
  const warehouses = useDataStore((s) => s.warehouses);
  const currentWarehouseId = useUIStore((s) => s.currentWarehouseId);
  const setCurrentWarehouse = useUIStore((s) => s.setCurrentWarehouse);
  const user = useAuthStore((s) => s.currentUser);

  const active = warehouses.filter((w) => w.status === "ACTIVE");
  const role = user?.role;
  const allowAll = canSeeAll(role);

  // Validate selection + auto-select cho DISPATCHER.
  useEffect(() => {
    if (active.length === 0) return; // chờ seed commit
    if (currentWarehouseId === "ALL") {
      if (!allowAll) setCurrentWarehouse(null); // vai trò không được xem tất cả
      return;
    }
    if (currentWarehouseId != null) {
      // id cụ thể: bỏ nếu kho không còn ACTIVE
      if (!active.some((w) => w.id === currentWarehouseId)) setCurrentWarehouse(null);
      return;
    }
    // chưa chọn → auto-select kho được gán cho DISPATCHER
    if (role === "DISPATCHER" && user?.warehouseId && active.some((w) => w.id === user.warehouseId)) {
      setCurrentWarehouse(user.warehouseId);
    }
  }, [active, currentWarehouseId, allowAll, role, user?.warehouseId, setCurrentWarehouse]);

  // Đang chờ seed kho.
  const selectionValid =
    active.length > 0 &&
    ((currentWarehouseId === "ALL" && allowAll) ||
      (currentWarehouseId != null &&
        currentWarehouseId !== "ALL" &&
        active.some((w) => w.id === currentWarehouseId)));

  if (selectionValid) return <>{children}</>;

  // Popup BẮT BUỘC chọn kho — phủ toàn màn hình, không có nút đóng / không thể tắt
  // (không Escape, không click ra ngoài, không render nội dung phía sau).
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="warehouse-gate-title"
    >
      <div className="w-full max-w-2xl space-y-6 rounded-xl border bg-background p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <WarehouseIcon className="h-6 w-6" />
          </div>
          <h1 id="warehouse-gate-title" className="text-xl font-semibold">
            Chọn kho làm việc
          </h1>
          <p className="text-sm text-muted-foreground">
            Bạn cần chọn kho trước khi thao tác. Mọi hành động (đơn hàng, điều phối, nhập/xuất) sẽ
            áp dụng cho kho đã chọn.
          </p>
        </div>

        {active.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Đang tải danh sách kho…</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {allowAll && (
              <button type="button" onClick={() => setCurrentWarehouse("ALL")} className="text-left">
                <Card className="h-full transition hover:border-primary hover:shadow-md">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Globe className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold">Tất cả kho</p>
                      <p className="text-sm text-muted-foreground">Xem tổng hợp toàn hệ thống</p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            )}
            {active.map((w) => (
              <button key={w.id} type="button" onClick={() => setCurrentWarehouse(w.id)} className="text-left">
                <Card className="h-full transition hover:border-primary hover:shadow-md">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-foreground">
                      <WarehouseIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{w.name}</p>
                      <p className="inline-flex items-center gap-1 text-sm text-muted-foreground truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{w.location.address}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
