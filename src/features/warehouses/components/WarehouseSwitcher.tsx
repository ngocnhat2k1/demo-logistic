"use client";

import { Warehouse as WarehouseIcon, ChevronDown, Check, Globe } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { useDataStore } from "@/shared/stores/data";
import { useUIStore } from "@/shared/stores/ui";
import { useAuthStore } from "@/features/auth/stores/auth";
import { cn } from "@/shared/utils";

/** Vai trò được phép xem "Tất cả kho". */
function canSeeAll(role?: string) {
  return role === "ADMIN" || role === "OPS_MANAGER";
}

export function WarehouseSwitcher() {
  const warehouses = useDataStore((s) => s.warehouses);
  const currentWarehouseId = useUIStore((s) => s.currentWarehouseId);
  const setCurrentWarehouse = useUIStore((s) => s.setCurrentWarehouse);
  const role = useAuthStore((s) => s.currentUser?.role);

  const active = warehouses.filter((w) => w.status === "ACTIVE");
  const isAll = currentWarehouseId === "ALL";
  const current = active.find((w) => w.id === currentWarehouseId);

  const label = isAll ? "Tất cả kho" : current?.name ?? "Chọn kho";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[200px] gap-1.5">
          {isAll ? <Globe className="h-4 w-4 shrink-0" /> : <WarehouseIcon className="h-4 w-4 shrink-0" />}
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Kho làm việc</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canSeeAll(role) && (
          <DropdownMenuItem onClick={() => setCurrentWarehouse("ALL")} className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="flex-1">Tất cả kho</span>
            {isAll && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        )}
        {active.map((w) => (
          <DropdownMenuItem key={w.id} onClick={() => setCurrentWarehouse(w.id)} className="gap-2">
            <WarehouseIcon className="h-4 w-4" />
            <span className={cn("flex-1 truncate", currentWarehouseId === w.id && "font-semibold")}>
              {w.name}
            </span>
            {currentWarehouseId === w.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        {active.length === 0 && (
          <DropdownMenuItem disabled>Chưa có kho hoạt động</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
