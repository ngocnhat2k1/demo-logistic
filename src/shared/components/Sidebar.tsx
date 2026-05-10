"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
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
    ChevronDown,
    X,
} from "lucide-react";
import { FaThLarge, FaUsers, FaShareAlt, FaTruck, FaTag, FaHome, FaRoad } from "react-icons/fa";
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

interface FakeItem {
    label: string;
    active?: boolean;
    children?: string[];
}
interface FakeSection {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
    items: FakeItem[];
}

const FAKE_SECTIONS: FakeSection[] = [
    {
        icon: FaThLarge,
        title: "TỔNG QUAN",
        items: [
            { label: "Trang điều khiển", active: true },
            { label: "Cài đặt", children: ["Cấu hình chung", "Bảo mật"] },
        ],
    },
    {
        icon: FaUsers,
        title: "TÀI KHOẢN",
        items: [
            { label: "Danh sách khách hàng" },
            { label: "Danh sách admin" },
            { label: "Danh sách nhân viên" },
            { label: "Danh sách liên hệ" },
            { label: "Quản lý hoa hồng", children: ["Cấu hình hoa hồng", "Lịch sử chi"] },
        ],
    },
    {
        icon: FaShareAlt,
        title: "ĐƠN HÀNG",
        items: [
            { label: "Đơn hàng", children: ["Đơn mua hộ", "Đơn ký gửi", "Đơn vận chuyển"] },
            { label: "Tạo đơn mua hộ khác" },
            { label: "Tạo đơn ký gửi" },
            { label: "Xử lý khiếu nại" },
        ],
    },
    {
        icon: FaTruck,
        title: "NGHIỆP VỤ KHO",
        items: [
            { label: "Gán kiện ký gửi" },
            { label: "Tracking" },
            { label: "Kho Trung Quốc", children: ["Nhập kho TQ", "Xuất kho TQ"] },
            { label: "Kho Việt Nam", children: ["Nhập kho VN", "Xuất kho VN"] },
            { label: "Quản lý kiện hàng", children: ["Danh sách kiện", "Kiện chờ xử lý"] },
        ],
    },
    {
        icon: FaTag,
        title: "NGHIỆP VỤ KẾ TOÁN",
        items: [
            { label: "Thống kê", children: ["Doanh thu", "Công nợ"] },
            { label: "Nạp tiền cá nhân" },
            { label: "Yêu cầu nạp" },
            { label: "Yêu cầu rút" },
        ],
    },
    {
        icon: FaHome,
        title: "CẤU HÌNH TRANG CHỦ",
        items: [{ label: "Cấu hình trang chủ" }],
    },
];

interface SidebarBodyProps {
    role: UserRole;
    fullName: string;
    path: string;
    expanded: Record<string, boolean>;
    toggleExpanded: (key: string) => void;
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
    expanded,
    toggleExpanded,
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
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.svg" alt="Mona Logistic" width={28} height={22} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight truncate">Mona Logistic</p>
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
                {/* ===== Mona modules (mockup) ===== */}
                {FAKE_SECTIONS.map((section) => {
                    const SectionIcon = section.icon;
                    return (
                        <div key={section.title} className="mb-2">
                            <p className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                                <SectionIcon className="h-3.5 w-3.5" aria-hidden />
                                {section.title}
                            </p>
                            <div className="space-y-0.5">
                                {section.items.map((item) => {
                                    const key = `${section.title}::${item.label}`;
                                    const isOpen = !!expanded[key];
                                    if (item.children) {
                                        return (
                                            <div key={key}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpanded(key)}
                                                    className={cn(
                                                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                                                        "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
                                                    )}
                                                >
                                                    <span className="flex-1 text-left">
                                                        {item.label}
                                                    </span>
                                                    <ChevronDown
                                                        className={cn(
                                                            "h-3.5 w-3.5 transition-transform",
                                                            isOpen && "rotate-180",
                                                        )}
                                                    />
                                                </button>
                                                {isOpen && (
                                                    <div className="ml-3 mt-0.5 space-y-0.5 border-l pl-3">
                                                        {item.children.map((child) => (
                                                            <div
                                                                key={child}
                                                                className="cursor-default rounded-md px-3 py-1.5 text-xs text-foreground/60"
                                                            >
                                                                {child}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    return (
                                        <div
                                            key={key}
                                            className={cn(
                                                "flex cursor-default items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                                                item.active
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
                                            )}
                                        >
                                            {item.label}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* ===== Mona Logistic — module chính ===== */}
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
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

    function toggleExpanded(key: string) {
        setExpanded((s) => ({ ...s, [key]: !s[key] }));
    }

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
                    expanded={expanded}
                    toggleExpanded={toggleExpanded}
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
                        expanded={expanded}
                        toggleExpanded={toggleExpanded}
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
