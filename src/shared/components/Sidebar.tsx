"use client";

import { useEffect, useState } from "react";
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
    Wallet,
    ShieldCheck,
    Warehouse,
    Boxes,
    PackageSearch,
    PackageMinus,
    PackagePlus,
    ChevronDown,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FaRoad } from "react-icons/fa";
import { useAuthStore } from "@/features/auth/stores/auth";
import { useDataStore } from "@/shared/stores/data";
import { useUIStore } from "@/shared/stores/ui";
import { cn } from "@/shared/utils";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import type { UserRole } from "@/shared/types";

interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    roles: readonly UserRole[];
    badgeKey?: string;
}

interface NavGroup {
    label: string;
    icon: LucideIcon;
    items: NavItem[];
}

// Mục đứng riêng (cấp 1) — trang chủ.
const DASHBOARD: NavItem = {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER", "SALES"],
};

// Menu 2 cấp: nhóm (cấp 1) → mục con (cấp 2).
const NAV_GROUPS: NavGroup[] = [
    {
        label: "Đơn hàng & Điều phối",
        icon: Package,
        items: [
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
                href: "/approvals",
                label: "Duyệt nhà xe dự phòng",
                icon: ShieldCheck,
                roles: ["ADMIN", "OPS_MANAGER"],
                badgeKey: "pendingReview",
            },
            {
                href: "/returns",
                label: "Trả hàng",
                icon: RotateCcw,
                roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER"],
            },
        ],
    },
    {
        label: "Kho hàng",
        icon: Warehouse,
        items: [
            {
                href: "/warehouse-ops/inventory",
                label: "Tồn kho",
                icon: PackageSearch,
                roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER"],
            },
            {
                href: "/warehouse-ops/inbound",
                label: "Nhập kho",
                icon: PackagePlus,
                roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER"],
            },
            {
                href: "/warehouse-ops/outbound",
                label: "Xuất kho",
                icon: PackageMinus,
                roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER"],
            },
            {
                href: "/warehouses",
                label: "Danh mục kho",
                icon: Warehouse,
                roles: ["ADMIN", "OPS_MANAGER"],
            },
            {
                href: "/products",
                label: "Sản phẩm / SKU",
                icon: Boxes,
                roles: ["ADMIN", "OPS_MANAGER"],
            },
        ],
    },
    {
        label: "Khách hàng",
        icon: Users,
        items: [
            {
                href: "/customers",
                label: "Khách hàng",
                icon: Users,
                roles: ["ADMIN", "OPS_MANAGER", "SALES", "DISPATCHER"],
            },
            {
                href: "/quota",
                label: "Hạn mức",
                icon: Wallet,
                roles: ["ADMIN", "OPS_MANAGER", "SALES", "DISPATCHER"],
            },
        ],
    },
    {
        label: "Đội xe",
        icon: Truck,
        items: [
            {
                href: "/fleet",
                label: "Đội xe",
                icon: Truck,
                roles: ["ADMIN", "OPS_MANAGER", "DISPATCHER"],
            },
        ],
    },
    {
        label: "Báo cáo & Tích hợp",
        icon: BarChart3,
        items: [
            {
                href: "/reports",
                label: "Báo cáo",
                icon: BarChart3,
                roles: ["ADMIN", "OPS_MANAGER"],
            },
            {
                href: "/integrations/cyber",
                label: "Tích hợp Cyber",
                icon: Cable,
                roles: ["ADMIN", "OPS_MANAGER"],
            },
        ],
    },
    {
        label: "Hệ thống",
        icon: Settings,
        items: [
            {
                href: "/settings/return-reasons",
                label: "Cấu hình lý do trả",
                icon: SlidersHorizontal,
                roles: ["ADMIN", "OPS_MANAGER"],
            },
            {
                href: "/admin/users",
                label: "Quản trị",
                icon: Settings,
                roles: ["ADMIN"],
            },
        ],
    },
];

function isItemActive(path: string, href: string) {
    return path === href || path.startsWith(href + "/");
}

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
    const pendingReviewCount = useDataStore(
        (s) => s.orders.filter((o) => o.status === "PENDING_SUPERVISOR_REVIEW").length,
    );
    const badgeCounts: Record<string, number> = { pendingReview: pendingReviewCount };

    // Lọc nhóm theo quyền: chỉ giữ mục con người dùng được xem.
    const visibleGroups = NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((it) => (it.roles as readonly string[]).includes(role)),
    })).filter((g) => g.items.length > 0);

    // Mặc định mở nhóm đang chứa route hiện tại; các nhóm khác mở sẵn để dễ khám phá.
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const toggleGroup = (label: string) =>
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });

    const dashboardVisible = (DASHBOARD.roles as readonly string[]).includes(role);

    return (
        <>
            <div className="flex items-center justify-between gap-2 px-4 py-4 border-b">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex min-w-0 flex-col gap-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logo.webp"
                            alt="Tratimex"
                            width={150}
                            height={28}
                            className="h-auto w-36"
                        />
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

            <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-hide">
                <p className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                    <FaRoad className="h-3.5 w-3.5" aria-hidden />
                    Tratimex LOGISTIC
                </p>

                {/* Cấp 1: Dashboard đứng riêng */}
                {dashboardVisible && (
                    <Link
                        href={DASHBOARD.href}
                        onClick={onNavigate}
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                            isItemActive(path, DASHBOARD.href)
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
                        )}
                    >
                        <DASHBOARD.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{DASHBOARD.label}</span>
                    </Link>
                )}

                {/* Cấp 1: các nhóm có thể thu gọn → cấp 2: mục con */}
                {visibleGroups.map((group) => {
                    const GroupIcon = group.icon;
                    const isOpen = !collapsed.has(group.label);
                    const groupActive = group.items.some((it) => isItemActive(path, it.href));
                    const groupBadge = group.items.reduce(
                        (sum, it) => sum + (it.badgeKey ? (badgeCounts[it.badgeKey] ?? 0) : 0),
                        0,
                    );
                    return (
                        <div key={group.label}>
                            <button
                                type="button"
                                onClick={() => toggleGroup(group.label)}
                                aria-expanded={isOpen}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition",
                                    groupActive
                                        ? "text-primary"
                                        : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
                                )}
                            >
                                <GroupIcon className="h-4 w-4 shrink-0" />
                                <span className="flex-1 truncate text-left">{group.label}</span>
                                {!isOpen && groupBadge > 0 && (
                                    <span className="inline-flex items-center justify-center rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-warning-foreground">
                                        {groupBadge}
                                    </span>
                                )}
                                <ChevronDown
                                    className={cn(
                                        "h-4 w-4 shrink-0 transition-transform",
                                        isOpen ? "" : "-rotate-90",
                                    )}
                                />
                            </button>

                            {isOpen && (
                                <div className="mt-0.5 space-y-0.5 border-l border-border/60 pl-3 ml-4">
                                    {group.items.map((item) => {
                                        const active = isItemActive(path, item.href);
                                        const count = item.badgeKey
                                            ? (badgeCounts[item.badgeKey] ?? 0)
                                            : 0;
                                        const ItemIcon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={onNavigate}
                                                className={cn(
                                                    "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                                                    active
                                                        ? "bg-primary text-primary-foreground"
                                                        : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
                                                )}
                                            >
                                                <span className="flex items-center gap-2 min-w-0">
                                                    <ItemIcon className="h-4 w-4 shrink-0" />
                                                    <span className="truncate">{item.label}</span>
                                                </span>
                                                {count > 0 && (
                                                    <span
                                                        className={cn(
                                                            "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold shrink-0",
                                                            active
                                                                ? "bg-primary-foreground/20 text-primary-foreground"
                                                                : "bg-warning text-warning-foreground",
                                                        )}
                                                    >
                                                        {count}
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
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
            <aside className="hidden md:flex w-[270px] shrink-0 flex-col border-r bg-card">
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
