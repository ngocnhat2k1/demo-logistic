"use client";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent } from "@/shared/ui/card";
import { useDataStore } from "@/shared/stores/data";
import { Progress } from "@/shared/ui/progress";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
    quotaLevelColor,
    quotaLabel,
    quotaInUse,
    quotaUsageRatio,
} from "@/features/orders/domain/quota";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Mail, Phone, CreditCard, CalendarClock, Wallet, Pencil } from "lucide-react";
import { formatKg, cn } from "@/shared/utils";
import { AddCustomerDialog } from "@/features/customers/components/AddCustomerDialog";
import type { Customer, QuotaType } from "@/shared/types";

type TabKey = "ALL" | QuotaType;

const TAB_DEFS: { key: TabKey; label: string }[] = [
    { key: "ALL", label: "Tất cả" },
    { key: "POSTPAID", label: "Thanh toán sau" },
    { key: "MONTHLY", label: "Theo tháng" },
    { key: "PREPAID", label: "Trả trước" },
];

const QUOTA_STYLE: Record<QuotaType, { row: string; badge: string; icon: typeof Wallet }> = {
    POSTPAID: {
        row: "border-l-4 border-l-violet-500",
        badge: "bg-violet-100 text-violet-700 border-violet-300",
        icon: Wallet,
    },
    MONTHLY: {
        row: "border-l-4 border-l-sky-500",
        badge: "bg-sky-100 text-sky-700 border-sky-300",
        icon: CalendarClock,
    },
    PREPAID: {
        row: "border-l-4 border-l-emerald-500",
        badge: "bg-emerald-100 text-emerald-700 border-emerald-300",
        icon: CreditCard,
    },
};

export default function CustomerListPage() {
    const customers = useDataStore((s) => s.customers);
    const [q, setQ] = useState("");
    const [tab, setTab] = useState<TabKey>("ALL");
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<Customer | null>(null);

    const counts: Record<TabKey, number> = {
        ALL: customers.length,
        POSTPAID: customers.filter((c) => c.quota.type === "POSTPAID").length,
        MONTHLY: customers.filter((c) => c.quota.type === "MONTHLY").length,
        PREPAID: customers.filter((c) => c.quota.type === "PREPAID").length,
    };

    const filtered = customers.filter((c) => {
        if (tab !== "ALL" && c.quota.type !== tab) return false;
        const t = q.toLowerCase();
        if (!t) return true;
        return (
            c.name.toLowerCase().includes(t) ||
            c.code.toLowerCase().includes(t) ||
            c.phone.includes(q) ||
            (c.email?.toLowerCase().includes(t) ?? false)
        );
    });

    return (
        <>
            <Topbar title="Khách hàng" />
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm theo tên, mã, SĐT, email..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">{filtered.length} khách hàng</p>
                    <div className="flex-1" />
                    <Button onClick={() => setAddOpen(true)}>
                        <Plus className="h-4 w-4" /> Thêm khách hàng
                    </Button>
                </div>

                <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
                    <TabsList>
                        {TAB_DEFS.map((t) => (
                            <TabsTrigger key={t.key} value={t.key}>
                                {t.label}{" "}
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                    ({counts[t.key]})
                                </span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-left">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Khách hàng</th>
                                        <th className="px-4 py-3 font-medium">Loại hạn mức</th>
                                        <th className="px-4 py-3 font-medium">Sử dụng</th>
                                        <th className="px-4 py-3 font-medium w-12"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-4 py-12 text-center text-muted-foreground"
                                            >
                                                Không có khách hàng phù hợp
                                            </td>
                                        </tr>
                                    )}
                                    {filtered.map((c) => {
                                        const lvl = quotaLevelColor(c.quota);
                                        const isPostpaid = c.quota.type === "POSTPAID";
                                        const ratio = quotaUsageRatio(c.quota);
                                        const style = QUOTA_STYLE[c.quota.type];
                                        const Icon = style.icon;
                                        return (
                                            <tr
                                                key={c.id}
                                                className={cn(
                                                    "border-t hover:bg-muted/30 transition-colors",
                                                    style.row,
                                                )}
                                            >
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={`/customers/${c.id}`}
                                                        className="block group"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-[11px] text-muted-foreground">
                                                                {c.code}
                                                            </span>
                                                            <span className="font-semibold group-hover:underline">
                                                                {c.name}
                                                            </span>
                                                        </div>
                                                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                            <span className="inline-flex items-center gap-1">
                                                                <Phone className="h-3 w-3" />
                                                                {c.phone}
                                                            </span>
                                                            {c.email && (
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Mail className="h-3 w-3" />
                                                                    {c.email}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "font-medium",
                                                            style.badge,
                                                        )}
                                                    >
                                                        <Icon className="h-3 w-3 mr-1" />
                                                        {quotaLabel(c.quota)}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 min-w-[260px]">
                                                    {isPostpaid ? (
                                                        <div className="text-xs space-y-0.5">
                                                            <p className="text-muted-foreground">
                                                                Đã giao tích lũy{" "}
                                                                <span className="font-semibold text-foreground">
                                                                    {formatKg(c.quota.used)}
                                                                </span>
                                                            </p>
                                                            <p
                                                                className={
                                                                    lvl === "danger"
                                                                        ? "text-destructive font-semibold"
                                                                        : lvl === "warn"
                                                                          ? "text-warning font-semibold"
                                                                          : "text-foreground"
                                                                }
                                                            >
                                                                Công nợ:{" "}
                                                                {formatKg(c.quota.outstanding ?? 0)}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <Progress
                                                                value={Math.min(100, ratio * 100)}
                                                                indicatorClassName={
                                                                    lvl === "danger"
                                                                        ? "bg-destructive"
                                                                        : lvl === "warn"
                                                                          ? "bg-warning"
                                                                          : "bg-primary"
                                                                }
                                                                className="w-full max-w-[220px]"
                                                            />
                                                            <p
                                                                className={cn(
                                                                    "text-xs",
                                                                    lvl === "danger"
                                                                        ? "text-destructive font-semibold"
                                                                        : lvl === "warn"
                                                                          ? "text-warning font-semibold"
                                                                          : "text-muted-foreground",
                                                                )}
                                                            >
                                                                {Math.round(ratio * 100)}% —{" "}
                                                                {formatKg(quotaInUse(c.quota))}/
                                                                {formatKg(c.quota.limit)}
                                                            </p>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-2 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setEditing(c);
                                                        }}
                                                        title="Sửa khách hàng"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <AddCustomerDialog open={addOpen} onOpenChange={setAddOpen} />
            <AddCustomerDialog
                open={!!editing}
                initial={editing}
                onOpenChange={(v) => {
                    if (!v) setEditing(null);
                }}
            />
        </>
    );
}
