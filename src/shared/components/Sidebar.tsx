"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  RotateCcw,
  BarChart3,
  Cable,
  Settings,
  SlidersHorizontal,
  Send,
  LogOut,
  Truck as TruckIcon,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/stores/auth";
import { useDataStore } from "@/shared/stores/data";
import { cn } from "@/shared/utils";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER", "SALES"] },
  { href: "/orders", label: "Đơn hàng", icon: Package, roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER", "SALES"] },
  { href: "/dispatch", label: "Điều phối", icon: Send, roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER"] },
  { href: "/customers", label: "Khách hàng", icon: Users, roles: ["ADMIN", "OPS_MANAGER", "SALES", "DISPATCHER"] },
  { href: "/fleet", label: "Đội xe", icon: Truck, roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER"] },
  { href: "/returns", label: "Trả hàng", icon: RotateCcw, roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER"] },
  { href: "/integrations/cyber", label: "Tích hợp Cyber", icon: Cable, roles: ["ADMIN", "OPS_MANAGER"] },
  { href: "/reports", label: "Báo cáo", icon: BarChart3, roles: ["ADMIN", "OPS_MANAGER"] },
  { href: "/settings/return-reasons", label: "Cấu hình lý do trả", icon: SlidersHorizontal, roles: ["ADMIN", "OPS_MANAGER"] },
  { href: "/admin/users", label: "Quản trị", icon: Settings, roles: ["ADMIN"] },
] as const;

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const resetAll = useDataStore((s) => s.resetAll);

  if (!user) return null;

  function handleReset() {
    if (!confirm("Reset toàn bộ dữ liệu demo về trạng thái seed gốc?")) return;
    resetAll();
    toast.success("Đã reset dữ liệu demo");
  }

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <TruckIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Điều độ GTVT</p>
          <p className="text-xs text-muted-foreground">Demo POC v1.0</p>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.filter((n) => (n.roles as readonly string[]).includes(user.role)).map((n) => {
          const Icon = n.icon;
          const active = path === n.href || path.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3 space-y-2">
        <div className="rounded-md bg-muted px-3 py-2">
          <p className="text-xs text-muted-foreground">Đăng nhập với</p>
          <p className="text-sm font-medium">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">{user.role}</p>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={handleReset}>
          <RefreshCw className="h-3.5 w-3.5" /> Reset Demo Data
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          <LogOut className="h-3.5 w-3.5" /> Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
