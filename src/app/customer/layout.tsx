"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Building2, Home, LogOut, Package } from "lucide-react";
import { useAuthStore } from "@/features/auth/stores/auth";
import { useDataStore } from "@/shared/stores/data";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/utils";

const CUSTOMER_NAV = [
  { href: "/customer", label: "Tổng quan", icon: Home },
  { href: "/customer#orders", label: "Đơn hàng", icon: Package },
] as const;

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.currentUser);
  const ready = useAuthStore((s) => s._hasHydrated);
  const logout = useAuthStore((s) => s.logout);
  const customer = useDataStore((s) => s.customers.find((c) => c.id === user?.customerId));

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.role !== "CUSTOMER") router.replace(user.role === "DRIVER" ? "/driver" : "/dashboard");
  }, [ready, user, router]);

  if (!user || user.role !== "CUSTOMER") return null;

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/customer" className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Cổng khách hàng</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {customer?.name ?? user.fullName}
                </span>
              </span>
            </Link>
            <Badge variant="outline" className="md:hidden">
              CUSTOMER
            </Badge>
          </div>

          <div className="flex items-center justify-between gap-2 md:justify-end">
            <nav className="flex items-center gap-1 rounded-md border bg-muted/40 p-1">
              {CUSTOMER_NAV.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/customer"
                    ? pathname === "/customer"
                    : pathname.startsWith("/customer/orders");
                return (
                  <Button key={item.href} asChild size="sm" variant={active ? "secondary" : "ghost"}>
                    <Link href={item.href} className={cn("px-3", active && "shadow-sm")}>
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                  </Button>
                );
              })}
            </nav>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5 md:px-6">{children}</main>
    </div>
  );
}
