"use client";

import { useEffect } from "react";
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
    RefreshCw,
    X,
} from "lucide-react";
import { FaRoad } from "react-icons/fa";
import { useAuthStore } from "@/features/auth/stores/auth";
import { useDataStore } from "@/shared/stores/data";
import { useUIStore } from "@/shared/stores/ui";
import { cn } from "@/shared/utils";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import type { UserRole } from "@/shared/types";

const NAV = [
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER", "SALES"],
    },
    {
        href: "/orders",
        label: "Đơn hàng",
        icon: Package,
        roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER", "SALES"],
    },
    {
        href: "/dispatch",
        label: "Điều phối",
        icon: Send,
        roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER"],
    },
    {
        href: "/customers",
        label: "Khách hàng",
        icon: Users,
        roles: ["ADMIN", "OPS_MANAGER", "SALES", "DISPATCHER"],
    },
    { href: "/fleet", label: "Đội xe", icon: Truck, roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER"] },
    {
        href: "/returns",
        label: "Trả hàng",
        icon: RotateCcw,
        roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER"],
    },
    {
        href: "/integrations/cyber",
        label: "Tích hợp Cyber",
        icon: Cable,
        roles: ["ADMIN", "OPS_MANAGER"],
    },
    { href: "/reports", label: "Báo cáo", icon: BarChart3, roles: ["ADMIN", "OPS_MANAGER"] },
    {
        href: "/settings/return-reasons",
        label: "Cấu hình lý do trả",
        icon: SlidersHorizontal,
        roles: ["ADMIN", "OPS_MANAGER"],
    },
    { href: "/admin/users", label: "Quản trị", icon: Settings, roles: ["ADMIN"] },
] as const;

interface SidebarBodyProps {
    role: UserRole;
    fullName: string;
    path: string;
    onNavigate?: () => void;
    onReset: () => void;
    onLogout: () => void;
    showCloseButton?: boolean;
    onClose?: () => void;
}

function SidebarBody({
    role,
    fullName,
    path,
    onNavigate,
    onReset,
    onLogout,
    showCloseButton,
    onClose,
}: SidebarBodyProps) {
    return (
        <>
            <div className="flex items-center justify-between gap-2 px-4 py-4 border-b">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex min-w-0 flex-col gap-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.webp" alt="Tratimex" width={150} height={28} className="h-auto w-36" />
                        <p className="text-xs text-muted-foreground truncate">
                            Quản lý điều độ vận tải
                        </p>
                    </div>
                </div>
                {showCloseButton && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="Đóng menu"
                        className="shrink-0"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                )}
            </div>

            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                <div className="mb-2">
                    <p className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                        <FaRoad className="h-3.5 w-3.5" aria-hidden />
                        MONA LOGISTIC
                    </p>
                    <div className="space-y-0.5">
                        {NAV.filter((n) => (n.roles as readonly string[]).includes(role)).map(
                            (n) => {
                                const active = path === n.href || path.startsWith(n.href + "/");
                                return (
                                    <Link
                                        key={n.href}
                                        href={n.href}
                                        onClick={onNavigate}
                                        className={cn(
                                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                                            active
                                                ? "bg-primary text-primary-foreground"
                                                : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
                                        )}
                                    >
                                        {n.label}
                                    </Link>
                                );
                            },
                        )}
                    </div>
                </div>
            </nav>

            <div className="border-t p-3 space-y-2">
                <div className="rounded-md bg-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">Đăng nhập với</p>
                    <p className="text-sm font-medium">{fullName}</p>
                    <p className="text-xs text-muted-foreground">{role}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={onReset}>
                    <RefreshCw className="h-3.5 w-3.5" /> Reset Demo Data
                </Button>
                <Button variant="ghost" size="sm" className="w-full" onClick={onLogout}>
                    <LogOut className="h-3.5 w-3.5" /> Đăng xuất
                </Button>
            </div>
        </>
    );
}

export function Sidebar() {
    const path = usePathname();
    const router = useRouter();
    const user = useAuthStore((s) => s.currentUser);
    const logout = useAuthStore((s) => s.logout);
    const resetAll = useDataStore((s) => s.resetAll);
    const mobileNavOpen = useUIStore((s) => s.mobileNavOpen);
    const closeMobileNav = useUIStore((s) => s.closeMobileNav);

    // Close drawer on route change
    useEffect(() => {
        closeMobileNav();
    }, [path, closeMobileNav]);

    // Close on Escape
    useEffect(() => {
        if (!mobileNavOpen) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") closeMobileNav();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [mobileNavOpen, closeMobileNav]);

    // Lock body scroll while drawer open
    useEffect(() => {
        if (typeof document === "undefined") return;
        if (mobileNavOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = prev;
            };
        }
    }, [mobileNavOpen]);

    if (!user) return null;

    function handleReset() {
        if (!confirm("Reset toàn bộ dữ liệu demo về trạng thái seed gốc?")) return;
        resetAll();
        toast.success("Đã reset dữ liệu demo");
    }

    function handleLogout() {
        logout();
        router.push("/login");
    }

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden md:flex w-72 shrink-0 flex-col border-r bg-card">
                <SidebarBody
                    role={user.role}
                    fullName={user.fullName}
                    path={path}
                    onReset={handleReset}
                    onLogout={handleLogout}
                />
            </aside>

            {/* Mobile drawer */}
            <div
                className={cn(
                    "md:hidden fixed inset-0 z-50 transition-opacity",
                    mobileNavOpen ? "pointer-events-auto" : "pointer-events-none",
                )}
                aria-hidden={!mobileNavOpen}
            >
                <div
                    className={cn(
                        "absolute inset-0 bg-black/60 transition-opacity",
                        mobileNavOpen ? "opacity-100" : "opacity-0",
                    )}
                    onClick={closeMobileNav}
                />
                <aside
                    className={cn(
                        "absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-card border-r flex flex-col shadow-xl transition-transform duration-200 ease-out",
                        mobileNavOpen ? "translate-x-0" : "-translate-x-full",
                    )}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu điều hướng"
                >
                    <SidebarBody
                        role={user.role}
                        fullName={user.fullName}
                        path={path}
                        onNavigate={closeMobileNav}
                        onReset={handleReset}
                        onLogout={handleLogout}
                        showCloseButton
                        onClose={closeMobileNav}
                    />
                </aside>
            </div>
        </>
    );
}
