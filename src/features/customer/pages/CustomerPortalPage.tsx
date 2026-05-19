"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
    AlertTriangle,
    ArrowRight,
    CalendarClock,
    CheckCircle2,
    Clock3,
    MapPin,
    Package,
    Route,
    Search,
    Truck,
    Wallet,
} from "lucide-react";
import { StatusBadge } from "@/features/orders/components/StatusBadge";
import { ORDER_STATUS_LABEL } from "@/features/orders/domain/orderStatus";
import {
    availableQuota,
    quotaInUse,
    quotaLabel,
    quotaLevelColor,
    quotaUsageRatio,
} from "@/features/orders/domain/quota";
import { useAuthStore } from "@/features/auth/stores/auth";
import { useDataStore } from "@/shared/stores/data";
import { MapCanvas } from "@/shared/map";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Progress } from "@/shared/ui/progress";
import { cn, formatKg } from "@/shared/utils";
import type { MapMarker, MapPolyline } from "@/shared/map/MapCanvas";
import type { Order, OrderStatus } from "@/shared/types";

const CLOSED_STATUSES: OrderStatus[] = [
    "DELIVERED",
    "RETURNED",
    "CANCELLED",
    "CANCELLED_AFTER_RETURN",
];
const ISSUE_STATUSES: OrderStatus[] = [
    "DELIVERY_FAILED",
    "RETURN_PROCESSING",
    "RETURNING_TO_WAREHOUSE",
    "RETURNED",
];
const FILTERS = [
    { key: "ALL", label: "Tất cả" },
    { key: "ACTIVE", label: "Đang xử lý" },
    { key: "DELIVERED", label: "Đã giao" },
    { key: "ISSUES", label: "Sự cố / trả hàng" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function CustomerPortalPage() {
    const user = useAuthStore((s) => s.currentUser);
    const customers = useDataStore((s) => s.customers);
    const orders = useDataStore((s) => s.orders);
    const vehicles = useDataStore((s) => s.vehicles);
    const [filter, setFilter] = useState<FilterKey>("ALL");
    const [q, setQ] = useState("");

    const customer = customers.find((c) => c.id === user?.customerId);
    const customerOrders = useMemo(() => {
        if (!customer) return [];
        return orders
            .filter((o) => o.customerId === customer.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [orders, customer]);

    if (!customer) {
        return (
            <Card>
                <CardContent className="p-6">
                    <p className="font-semibold">Tài khoản khách hàng chưa được liên kết.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Vui lòng reset dữ liệu demo hoặc chọn tài khoản khách hàng có `customerId`.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const activeOrders = customerOrders.filter((o) => !CLOSED_STATUSES.includes(o.status));
    const deliveredOrders = customerOrders.filter((o) => o.status === "DELIVERED");
    const issueOrders = customerOrders.filter((o) => ISSUE_STATUSES.includes(o.status));
    const trackingOrder =
        activeOrders.find((o) => o.assignments.length > 0) ?? activeOrders[0] ?? customerOrders[0];
    const trackingAssignment = trackingOrder?.assignments[0];
    const trackingVehicle = trackingAssignment
        ? vehicles.find((v) => v.id === trackingAssignment.vehicleId)
        : undefined;
    const trackingDriverName = trackingVehicle?.driverName;
    const trackingProgress = trackingOrder
        ? estimateProgress(trackingOrder, trackingVehicle?.routeProgress)
        : 0;
    const quotaState = quotaLevelColor(customer.quota);
    const query = q.trim().toLowerCase();
    const visibleOrders = customerOrders.filter((o) => {
        if (filter === "ACTIVE" && CLOSED_STATUSES.includes(o.status)) return false;
        if (filter === "DELIVERED" && o.status !== "DELIVERED") return false;
        if (filter === "ISSUES" && !ISSUE_STATUSES.includes(o.status)) return false;
        if (!query) return true;
        return `${o.code} ${o.description} ${o.pickup.address} ${o.dropoff.address}`
            .toLowerCase()
            .includes(query);
    });

    const markers: MapMarker[] = [];
    const polylines: MapPolyline[] = [];
    if (trackingOrder) {
        markers.push(
            {
                id: "pickup",
                lat: trackingOrder.pickup.lat,
                lng: trackingOrder.pickup.lng,
                popup: `Lấy hàng: ${trackingOrder.pickup.address}`,
                kind: "pickup",
            },
            {
                id: "dropoff",
                lat: trackingOrder.dropoff.lat,
                lng: trackingOrder.dropoff.lng,
                popup: `Giao hàng: ${trackingOrder.dropoff.address}`,
                kind: "dropoff",
            },
        );
        if (trackingVehicle) {
            markers.push({
                id: trackingVehicle.id,
                lat: trackingVehicle.currentLocation.lat,
                lng: trackingVehicle.currentLocation.lng,
                popup: `${trackingVehicle.plateNumber} • ${trackingDriverName ?? "Tài xế"}`,
                kind: trackingVehicle.status === "BUSY" ? "vehicle-busy" : "vehicle-idle",
            });
        }
        polylines.push({
            id: trackingOrder.id,
            points:
                trackingVehicle?.routePolyline && trackingVehicle.routePolyline.length > 1
                    ? trackingVehicle.routePolyline
                    : [trackingOrder.pickup, trackingOrder.dropoff],
            color: "#0f766e",
        });
    }

    return (
        <div className="space-y-5">
            <section className="grid gap-3 md:grid-cols-4">
                <MetricCard
                    icon={<Package className="h-4 w-4" />}
                    label="Tổng đơn"
                    value={customerOrders.length}
                />
                <MetricCard
                    icon={<Clock3 className="h-4 w-4" />}
                    label="Đang xử lý"
                    value={activeOrders.length}
                />
                <MetricCard
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Đã giao"
                    value={deliveredOrders.length}
                />
                <MetricCard
                    icon={<AlertTriangle className="h-4 w-4" />}
                    label="Sự cố"
                    value={issueOrders.length}
                    tone={issueOrders.length > 0 ? "warn" : "muted"}
                />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
                <Card className="overflow-hidden">
                    <CardHeader className="pb-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Route className="h-4 w-4" /> Theo dõi vận chuyển
                                </CardTitle>
                                {trackingOrder && (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {trackingOrder.code} •{" "}
                                        {ORDER_STATUS_LABEL[trackingOrder.status]}
                                    </p>
                                )}
                            </div>
                            {trackingOrder && <StatusBadge status={trackingOrder.status} />}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {trackingOrder ? (
                            <>
                                <div className="overflow-hidden rounded-md border">
                                    <MapCanvas
                                        center={
                                            trackingVehicle?.currentLocation ?? trackingOrder.pickup
                                        }
                                        zoom={10}
                                        markers={markers}
                                        polylines={polylines}
                                        className="h-72 w-full"
                                    />
                                </div>
                                <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                                    <AddressBlock
                                        label="Điểm lấy"
                                        address={trackingOrder.pickup.address}
                                    />
                                    <ArrowRight className="hidden h-4 w-4 text-muted-foreground md:block" />
                                    <AddressBlock
                                        label="Điểm giao"
                                        address={trackingOrder.dropoff.address}
                                        alignRight
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Tiến độ tuyến</span>
                                        <span>{trackingProgress}%</span>
                                    </div>
                                    <Progress value={trackingProgress} className="h-2" />
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                    <InfoTile
                                        label="Xe"
                                        value={trackingVehicle?.plateNumber ?? "Chưa phân xe"}
                                        icon={<Truck className="h-4 w-4" />}
                                    />
                                    <InfoTile
                                        label="Tài xế"
                                        value={trackingDriverName ?? "Chưa có"}
                                    />
                                    <InfoTile
                                        label="Hẹn giao"
                                        value={formatDate(trackingOrder.requestedDeliveryAt)}
                                        icon={<CalendarClock className="h-4 w-4" />}
                                    />
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Chưa có đơn hàng để theo dõi.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Wallet className="h-4 w-4" /> Hạn mức / công nợ
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {quotaLabel(customer.quota)}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {customer.quota.type === "POSTPAID" ? (
                            <div className="grid gap-3">
                                <QuotaNumber
                                    label="Công nợ chưa thu"
                                    value={formatKg(customer.quota.outstanding ?? 0)}
                                    tone={quotaState}
                                />
                                <QuotaNumber
                                    label="Đã giao tích lũy"
                                    value={formatKg(customer.quota.used)}
                                />
                                <QuotaNumber
                                    label="Đang giữ chỗ"
                                    value={formatKg(customer.quota.reserved ?? 0)}
                                />
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Đã dùng</span>
                                        <span className="font-semibold">
                                            {Math.round(quotaUsageRatio(customer.quota) * 100)}%
                                        </span>
                                    </div>
                                    <Progress
                                        value={Math.min(100, quotaUsageRatio(customer.quota) * 100)}
                                        indicatorClassName={
                                            quotaState === "danger"
                                                ? "bg-destructive"
                                                : quotaState === "warn"
                                                  ? "bg-warning"
                                                  : "bg-primary"
                                        }
                                        className="h-3"
                                    />
                                </div>
                                <div className="grid gap-3">
                                    <QuotaNumber
                                        label="Khả dụng"
                                        value={formatKg(availableQuota(customer.quota))}
                                        tone={quotaState === "danger" ? "danger" : "ok"}
                                    />
                                    <QuotaNumber
                                        label="Đang giữ chỗ"
                                        value={formatKg(customer.quota.reserved ?? 0)}
                                    />
                                    <QuotaNumber
                                        label="Đã tiêu thụ"
                                        value={formatKg(quotaInUse(customer.quota))}
                                    />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </section>

            <section id="orders" className="space-y-3 scroll-mt-24">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-base font-semibold">Đơn hàng của {customer.code}</h2>
                        <p className="text-sm text-muted-foreground">
                            {visibleOrders.length} đơn phù hợp
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Tìm mã đơn, tuyến..."
                                className="w-full pl-9 sm:w-64"
                            />
                        </div>
                        <div className="flex rounded-md border bg-white p-1">
                            {FILTERS.map((item) => (
                                <Button
                                    key={item.key}
                                    size="sm"
                                    variant={filter === item.key ? "secondary" : "ghost"}
                                    onClick={() => setFilter(item.key)}
                                    className="h-8 px-2 text-xs"
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {visibleOrders.length === 0 && (
                                <p className="p-6 text-center text-sm text-muted-foreground">
                                    Không có đơn hàng phù hợp.
                                </p>
                            )}
                            {visibleOrders.map((order) => (
                                <CustomerOrderRow
                                    key={order.id}
                                    order={order}
                                    vehiclePlate={vehiclePlate(order, vehicles)}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

function CustomerOrderRow({ order, vehiclePlate }: { order: Order; vehiclePlate: string }) {
    return (
        <Link
            href={`/customer/orders/${order.id}`}
            className="block p-4 transition hover:bg-muted/40"
        >
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-primary">
                            {order.code}
                        </span>
                        <StatusBadge status={order.status} />
                        <Badge variant="outline">{order.source}</Badge>
                    </div>
                    <p className="truncate text-sm font-medium">{order.description}</p>
                    <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                        <span className="flex min-w-0 items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-success" />
                            <span className="truncate">{order.pickup.address}</span>
                        </span>
                        <span className="flex min-w-0 items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-destructive" />
                            <span className="truncate">{order.dropoff.address}</span>
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs md:min-w-[260px]">
                    <MiniValue label="KL" value={formatKg(order.weightKg)} />
                    <MiniValue label="Xe" value={vehiclePlate} />
                    <MiniValue
                        label="Hẹn giao"
                        value={formatDate(order.requestedDeliveryAt, "dd/MM")}
                    />
                </div>
            </div>
        </Link>
    );
}

function MetricCard({
    icon,
    label,
    value,
    tone = "default",
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    tone?: "default" | "warn" | "muted";
}) {
    return (
        <Card>
            <CardContent className="flex items-center justify-between p-4">
                <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p
                        className={cn(
                            "mt-1 text-2xl font-semibold",
                            tone === "warn" && "text-warning",
                            tone === "muted" && "text-muted-foreground",
                        )}
                    >
                        {value}
                    </p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    {icon}
                </span>
            </CardContent>
        </Card>
    );
}

function AddressBlock({
    label,
    address,
    alignRight,
}: {
    label: string;
    address: string;
    alignRight?: boolean;
}) {
    return (
        <div
            className={cn(
                "min-w-0 rounded-md border bg-muted/30 p-3",
                alignRight && "md:text-right",
            )}
        >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-medium">{address}</p>
        </div>
    );
}

function InfoTile({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon?: React.ReactNode;
}) {
    return (
        <div className="rounded-md border bg-muted/20 p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {icon}
                {label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold">{value}</p>
        </div>
    );
}

function QuotaNumber({
    label,
    value,
    tone = "default",
}: {
    label: string;
    value: string;
    tone?: "default" | "ok" | "warn" | "danger";
}) {
    return (
        <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p
                className={cn(
                    "mt-1 text-lg font-semibold",
                    tone === "ok" && "text-success",
                    tone === "warn" && "text-warning",
                    tone === "danger" && "text-destructive",
                )}
            >
                {value}
            </p>
        </div>
    );
}

function MiniValue({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md bg-muted/50 p-2">
            <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
            <p className="mt-0.5 truncate font-semibold">{value}</p>
        </div>
    );
}

function estimateProgress(order: Order, routeProgress?: number) {
    if (routeProgress !== undefined)
        return Math.round(Math.max(0, Math.min(1, routeProgress)) * 100);
    switch (order.status) {
        case "NEW":
            return 5;
        case "PENDING_DISPATCH":
            return 10;
        case "DISPATCHED":
            return 25;
        case "PICKED_UP":
            return 45;
        case "IN_TRANSIT":
            return 70;
        case "DELIVERED":
        case "RETURNED":
            return 100;
        case "DELIVERY_FAILED":
        case "RETURN_PROCESSING":
        case "RETURNING_TO_WAREHOUSE":
            return 80;
        default:
            return 0;
    }
}

function vehiclePlate(order: Order, vehicles: { id: string; plateNumber: string }[]) {
    const vehicleId = order.assignments[0]?.vehicleId;
    if (!vehicleId) return "Chưa phân";
    return vehicles.find((v) => v.id === vehicleId)?.plateNumber ?? "—";
}

function formatDate(value: string, pattern = "dd/MM HH:mm") {
    return format(new Date(value), pattern, { locale: vi });
}
