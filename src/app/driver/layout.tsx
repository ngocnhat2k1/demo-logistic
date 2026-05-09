"use client";

import { useAuthStore } from "@/features/auth/stores/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Home, ListTodo, AlertTriangle, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils";
import { useDataStore } from "@/shared/stores/data";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const user = useAuthStore((s) => s.currentUser);
  const ready = useAuthStore((s) => s._hasHydrated);
  const logout = useAuthStore((s) => s.logout);
  const orders = useDataStore((s) => s.orders);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.role !== "DRIVER" && user.role !== "ADMIN") router.replace("/dashboard");
  }, [ready, user, router]);

  if (!user) return null;

  const myDriverId = user.driverId;
  const todayOrders = orders.filter((o) =>
    o.assignments.some((a) => a.driverId === myDriverId) &&
    !["DELIVERED", "CANCELLED", "RETURNED", "CANCELLED_AFTER_RETURN"].includes(o.status)
  ).length;

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto border-x">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
        <div>
          <p className="text-xs opacity-80">Xin chào</p>
          <p className="font-semibold">{user.fullName}</p>
        </div>
        <button onClick={() => { logout(); router.push("/login"); }} className="rounded-md p-2 hover:bg-white/10">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t bg-card grid grid-cols-3 z-50">
        <NavItem href="/driver" icon={Home} label="Trang chủ" active={path === "/driver"} />
        <NavItem href="/driver/orders" icon={ListTodo} label={`Đơn (${todayOrders})`} active={path.startsWith("/driver/orders")} />
        <NavItem href="/driver/sos" icon={AlertTriangle} label="SOS" active={path === "/driver/sos"} danger />
      </nav>
    </div>
  );
}

function NavItem({ href, icon: Icon, label, active, danger }: { href: string; icon: React.ElementType; label: string; active: boolean; danger?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 py-3 text-xs font-medium",
        active ? (danger ? "text-destructive" : "text-primary") : "text-muted-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
