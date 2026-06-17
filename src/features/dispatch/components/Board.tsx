"use client";

import { useMemo, useState } from "react";
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    useDraggable,
    useDroppable,
} from "@dnd-kit/core";
import { useDataStore } from "@/shared/stores/data";
import { useScopedOrders } from "@/shared/hooks/useScopedData";
import { useAuthStore } from "@/features/auth/stores/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
    Sparkles,
    Truck,
    Package,
    AlertTriangle,
    MapPin,
    Map as MapIcon,
    Hand,
    ChevronRight,
    CheckCircle2,
    X,
    Search,
} from "lucide-react";
import { toast } from "sonner";
import { formatKg, cn } from "@/shared/utils";
import { AISuggestModal } from "./AISuggestModal";
import { AcceptDispatchDialog } from "./AcceptDispatchDialog";
import { MobileAssignSheet } from "./MobileAssignSheet";
import { AutoDispatchPreviewModal } from "./AutoDispatchPreviewModal";
import { CarrierPickerSheet } from "./CarrierPickerSheet";
import { SupervisorReviewDialog } from "./SupervisorReviewDialog";
import { Button } from "@/shared/ui/button";
import { FleetMapPanel } from "./FleetMapPanel";
import { analyzeBoard, type PerOrderAi } from "@/features/dispatch/domain/aiMockEngine";
import { AiModeToggle } from "./ai/AiModeToggle";
import { AIAnalyzingBanner } from "./ai/AIAnalyzingBanner";
import { AISuggestionRail } from "./ai/AISuggestionRail";
import { AIOrderCardOverlay } from "./ai/AIOrderCardOverlay";
import type { Carrier, Order, Vehicle } from "@/shared/types";
import { ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import Link from "next/link";

type MobileTab = "orders" | "map" | "vehicles";
type OrdersTab = "pending" | "review" | "assigned";

export function DispatchBoard() {
    const orders = useScopedOrders();
    const vehicles = useDataStore((s) => s.vehicles); // pool điều phối: luôn dùng full, KHÔNG scope theo kho
    const carriers = useDataStore((s) => s.carriers);
    const customers = useDataStore((s) => s.customers);
    const unassignOrder = useDataStore((s) => s.unassignOrder);
    const submitOrderCarrier = useDataStore((s) => s.submitOrderCarrier);
    const assignOrderToVehicle = useDataStore((s) => s.assignOrderToVehicle);
    const warehouses = useDataStore((s) => s.warehouses);
    const user = useAuthStore((s) => s.currentUser);

    const [aiOrder, setAiOrder] = useState<Order | null>(null);
    const [acceptCtx, setAcceptCtx] = useState<{ order: Order; vehicle: Vehicle } | null>(null);
    const [carrierPickOrder, setCarrierPickOrder] = useState<Order | null>(null);
    const [assignCtx, setAssignCtx] = useState<{ order: Order; carrierId: string } | null>(null);
    const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
    const [mobileTab, setMobileTab] = useState<MobileTab>("orders");
    const [ordersTab, setOrdersTab] = useState<OrdersTab>("pending");
    const [autoOpen, setAutoOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [vehicleSearch, setVehicleSearch] = useState("");
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [aiMode, setAiMode] = useState(false);

    // Chọn xe để focus trên bản đồ (đồng thời chuyển sang tab Bản đồ ở mobile).
    function focusVehicle(id: string | null) {
        setSelectedVehicleId(id);
        if (id) setMobileTab("map");
    }

    const pendingOrders = useMemo(
        () => orders.filter((o) => o.status === "NEW" || o.status === "PENDING_DISPATCH"),
        [orders],
    );
    const reviewOrders = useMemo(
        () =>
            orders
                .filter((o) => o.status === "PENDING_SUPERVISOR_REVIEW")
                .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1)),
        [orders],
    );
    const assignedOrders = useMemo(
        () =>
            orders
                .filter(
                    (o) =>
                        o.status === "PENDING_ACCEPT" ||
                        o.status === "DISPATCHED" ||
                        o.status === "PICKED_UP" ||
                        o.status === "IN_TRANSIT",
                )
                .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1)),
        [orders],
    );
    const q = searchQuery.trim().toLowerCase();
    const filteredPending = useMemo(
        () =>
            q
                ? pendingOrders.filter(
                      (o) =>
                          o.code.toLowerCase().includes(q) ||
                          (customers.find((c) => c.id === o.customerId)?.name ?? "")
                              .toLowerCase()
                              .includes(q) ||
                          o.dropoff.address.toLowerCase().includes(q),
                  )
                : pendingOrders,
        [pendingOrders, customers, q],
    );
    const filteredReview = useMemo(
        () =>
            q
                ? reviewOrders.filter(
                      (o) =>
                          o.code.toLowerCase().includes(q) ||
                          (customers.find((c) => c.id === o.customerId)?.name ?? "")
                              .toLowerCase()
                              .includes(q) ||
                          o.dropoff.address.toLowerCase().includes(q),
                  )
                : reviewOrders,
        [reviewOrders, customers, q],
    );
    const filteredAssigned = useMemo(
        () =>
            q
                ? assignedOrders.filter(
                      (o) =>
                          o.code.toLowerCase().includes(q) ||
                          (customers.find((c) => c.id === o.customerId)?.name ?? "")
                              .toLowerCase()
                              .includes(q) ||
                          o.dropoff.address.toLowerCase().includes(q),
                  )
                : assignedOrders,
        [assignedOrders, customers, q],
    );

    // ----- Smart Dispatch (Chế độ AI) -----
    const analysis = useMemo(
        () =>
            aiMode
                ? analyzeBoard({
                      orders: pendingOrders,
                      allOrders: orders,
                      vehicles,
                      warehouses,
                      nowIso: new Date().toISOString(),
                  })
                : null,
        [aiMode, pendingOrders, orders, vehicles, warehouses],
    );
    const aiPending = useMemo(() => {
        if (!aiMode || !analysis) return filteredPending;
        return [...filteredPending].sort(
            (a, b) => (analysis.perOrder.get(b.id)?.risk.score ?? 0) - (analysis.perOrder.get(a.id)?.risk.score ?? 0),
        );
    }, [aiMode, analysis, filteredPending]);

    function aiAssign(order: Order, ai: PerOrderAi) {
        if (!user || !ai.suggestion) return;
        const v = vehicles.find((x) => x.id === ai.suggestion!.vehicleId);
        if (!v) return;
        const res = submitOrderCarrier(order.id, v.carrierId, user.id);
        if (!res.ok) {
            toast.error(res.reason || "Không phân được xe");
            return;
        }
        if (res.needsReview) {
            toast.success(`Đã gửi ${order.code} lên giám sát duyệt (NCC dự phòng)`);
            return;
        }
        const a = assignOrderToVehicle(order.id, v.id, user.id);
        if (a) toast.success(`AI đã phân ${v.plateNumber} cho ${order.code}`);
        else toast.error("Không phân được xe — kiểm tra trạng thái đơn");
    }

    function renderAiSection() {
        return (
            <div className="space-y-2">
                <AiModeToggle checked={aiMode} onChange={setAiMode} />
                {aiMode && analysis && (
                    <>
                        <AIAnalyzingBanner orderCount={pendingOrders.length} runKey={pendingOrders.length} />
                        <AISuggestionRail clusters={analysis.clusters} />
                    </>
                )}
            </div>
        );
    }

    const availableVehicles = useMemo(
        () => vehicles.filter((v) => v.status === "AVAILABLE"),
        [vehicles],
    );
    const busyVehicles = useMemo(() => vehicles.filter((v) => v.status === "BUSY"), [vehicles]);
    const vq = vehicleSearch.trim().toLowerCase();
    const filteredAvailable = useMemo(
        () =>
            vq
                ? availableVehicles.filter(
                      (v) =>
                          v.plateNumber.toLowerCase().includes(vq) ||
                          v.driverName.toLowerCase().includes(vq) ||
                          v.type.toLowerCase().includes(vq),
                  )
                : availableVehicles,
        [availableVehicles, vq],
    );
    const filteredBusy = useMemo(
        () =>
            vq
                ? busyVehicles.filter(
                      (v) =>
                          v.plateNumber.toLowerCase().includes(vq) ||
                          v.driverName.toLowerCase().includes(vq) ||
                          v.type.toLowerCase().includes(vq),
                  )
                : busyVehicles,
        [busyVehicles, vq],
    );
    const canReview = user?.role === "ADMIN" || user?.role === "OPS_MANAGER";

    function handlePickCarrier(carrier: Carrier) {
        if (!user || !carrierPickOrder) return;
        const res = submitOrderCarrier(carrierPickOrder.id, carrier.id, user.id);
        if (!res.ok) {
            toast.error(res.reason || "Không chọn được NCC");
            return;
        }
        if (res.needsReview) {
            toast.success(`Đã gửi ${carrierPickOrder.code} lên giám sát duyệt`);
            setCarrierPickOrder(null);
            return;
        }
        setAssignCtx({ order: carrierPickOrder, carrierId: carrier.id });
        setCarrierPickOrder(null);
    }

    function handlePickVehicleAfterCarrier(v: Vehicle) {
        if (!assignCtx) return;
        setAcceptCtx({ order: assignCtx.order, vehicle: v });
        setAssignCtx(null);
    }

    function handleUnassign(order: Order) {
        if (!user) return;
        const active = order.assignments.find((a) => a.status === "ASSIGNED");
        if (!active) {
            toast.error("Đơn đã được xe nhận, không thể huỷ phân");
            return;
        }
        unassignOrder(order.id, active.id, user.id);
        toast.success(`Đã huỷ phân ${order.code}`);
    }

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    function onDragEnd(e: DragEndEvent) {
        if (!user) return;
        const orderId = String(e.active.id);
        const overId = e.over?.id;
        if (!overId) return;
        const vehicleId = String(overId);
        const order = orders.find((o) => o.id === orderId);
        const vehicle = vehicles.find((v) => v.id === vehicleId);
        if (!order || !vehicle) return;
        const carrier = carriers.find((c) => c.id === vehicle.carrierId);
        if (!carrier) {
            setAcceptCtx({ order, vehicle });
            return;
        }
        const res = submitOrderCarrier(order.id, carrier.id, user.id);
        if (!res.ok) {
            toast.error(res.reason || "Không chọn được NCC cho đơn");
            return;
        }
        if (res.needsReview) {
            toast.success(`Đã gửi ${order.code} (NCC dự phòng ${carrier.name}) lên giám sát duyệt`);
            return;
        }
        setAcceptCtx({ order, vehicle });
    }

    const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";

    return (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            {/* ===== MOBILE / TABLET (<1024px): tabs + tap-to-assign ===== */}
            <div className="lg:hidden flex flex-col h-full gap-3">
                {/* Hint banner */}
                <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary flex items-start gap-2">
                    <Hand className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Chạm vào đơn để chọn xe phân giao</span>
                </div>

                {/* Tab switcher */}
                <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1 shrink-0">
                    <TabButton
                        active={mobileTab === "orders"}
                        onClick={() => setMobileTab("orders")}
                    >
                        <Package className="h-4 w-4" />
                        <span className="text-xs">Đơn</span>
                        <Badge
                            variant={mobileTab === "orders" ? "secondary" : "outline"}
                            className="text-[10px] h-4 px-1.5"
                        >
                            {pendingOrders.length}
                        </Badge>
                    </TabButton>
                    <TabButton active={mobileTab === "map"} onClick={() => setMobileTab("map")}>
                        <MapIcon className="h-4 w-4" />
                        <span className="text-xs">Bản đồ</span>
                    </TabButton>
                    <TabButton
                        active={mobileTab === "vehicles"}
                        onClick={() => setMobileTab("vehicles")}
                    >
                        <Truck className="h-4 w-4" />
                        <span className="text-xs">Xe</span>
                        <Badge
                            variant={mobileTab === "vehicles" ? "secondary" : "outline"}
                            className="text-[10px] h-4 px-1.5"
                        >
                            {availableVehicles.length}
                        </Badge>
                    </TabButton>
                </div>

                {/* Tab content */}
                <div className="flex-1 min-h-0">
                    {mobileTab === "orders" && (
                        <Card className="h-full flex flex-col">
                            <div className="p-3 space-y-2 border-b">
                                <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
                                    <button
                                        onClick={() => setOrdersTab("pending")}
                                        className={cn(
                                            "flex items-center justify-center gap-1 rounded px-1.5 py-1.5 text-[11px] transition",
                                            ordersTab === "pending"
                                                ? "bg-background shadow-sm font-semibold"
                                                : "text-muted-foreground hover:text-foreground",
                                        )}
                                    >
                                        <Package className="h-3.5 w-3.5" />
                                        Chờ phân
                                        <Badge
                                            variant={
                                                ordersTab === "pending" ? "secondary" : "outline"
                                            }
                                            className="text-[10px] h-4 px-1"
                                        >
                                            {pendingOrders.length}
                                        </Badge>
                                    </button>
                                    <button
                                        onClick={() => setOrdersTab("review")}
                                        className={cn(
                                            "flex items-center justify-center gap-1 rounded px-1.5 py-1.5 text-[11px] transition",
                                            ordersTab === "review"
                                                ? "bg-background shadow-sm font-semibold"
                                                : "text-muted-foreground hover:text-foreground",
                                        )}
                                    >
                                        <ShieldAlert className="h-3.5 w-3.5" />
                                        Chờ duyệt
                                        <Badge
                                            variant={ordersTab === "review" ? "warning" : "outline"}
                                            className="text-[10px] h-4 px-1"
                                        >
                                            {reviewOrders.length}
                                        </Badge>
                                    </button>
                                    <button
                                        onClick={() => setOrdersTab("assigned")}
                                        className={cn(
                                            "flex items-center justify-center gap-1 rounded px-1.5 py-1.5 text-[11px] transition",
                                            ordersTab === "assigned"
                                                ? "bg-background shadow-sm font-semibold"
                                                : "text-muted-foreground hover:text-foreground",
                                        )}
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Đã phân
                                        <Badge
                                            variant={
                                                ordersTab === "assigned" ? "secondary" : "outline"
                                            }
                                            className="text-[10px] h-4 px-1"
                                        >
                                            {assignedOrders.length}
                                        </Badge>
                                    </button>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Tìm mã đơn, khách, địa chỉ..."
                                        className="w-full rounded-md border bg-background pl-7 pr-7 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                                {ordersTab === "pending" && (
                                    <>
                                        <div className="flex items-center gap-1.5 rounded-md bg-primary/5 px-2 py-1 text-[10px] text-primary">
                                            <Sparkles className="h-3 w-3 shrink-0" />
                                            <span className="leading-snug">
                                                Tự động điều phối: BẬT — đơn mới được AI phân ngay; mục này chỉ còn đơn cần xử lý tay.
                                            </span>
                                        </div>
                                        {renderAiSection()}
                                        <Button
                                            size="sm"
                                            className="w-full h-8"
                                            disabled={
                                                pendingOrders.length === 0 ||
                                                availableVehicles.length === 0
                                            }
                                            onClick={() => setAutoOpen(true)}
                                        >
                                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                            Chạy lại AI cho đơn còn lại
                                        </Button>
                                    </>
                                )}
                            </div>
                            <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
                                {ordersTab === "pending" && (
                                    <>
                                        {filteredPending.length === 0 && (
                                            <div className="text-center py-12 text-sm text-muted-foreground">
                                                {q ? "Không tìm thấy đơn phù hợp" : "Không có đơn nào chờ phân"}
                                            </div>
                                        )}
                                        {aiPending.map((o) => {
                                            const ai = aiMode ? analysis?.perOrder.get(o.id) : undefined;
                                            return (
                                                <MobileOrderRow
                                                    key={o.id}
                                                    order={o}
                                                    customerName={customerName(o.customerId)}
                                                    onAssign={() => setCarrierPickOrder(o)}
                                                    onSuggest={() => setAiOrder(o)}
                                                    ai={ai}
                                                    onAiAssign={ai ? () => aiAssign(o, ai) : undefined}
                                                />
                                            );
                                        })}
                                    </>
                                )}
                                {ordersTab === "review" && (
                                    <>
                                        {filteredReview.length === 0 && (
                                            <div className="text-center py-12 text-sm text-muted-foreground">
                                                {q ? "Không tìm thấy đơn phù hợp" : "Không có đơn nào đang chờ duyệt"}
                                            </div>
                                        )}
                                        {filteredReview.map((o) => (
                                            <ReviewOrderCard
                                                key={o.id}
                                                order={o}
                                                customerName={customerName(o.customerId)}
                                                carrierName={
                                                    carriers.find((c) => c.id === o.carrierId)
                                                        ?.name ?? "—"
                                                }
                                                canReview={canReview}
                                                onReview={() => setReviewOrder(o)}
                                            />
                                        ))}
                                    </>
                                )}
                                {ordersTab === "assigned" && (
                                    <>
                                        {filteredAssigned.length === 0 && (
                                            <div className="text-center py-12 text-sm text-muted-foreground">
                                                {q ? "Không tìm thấy đơn phù hợp" : "Chưa có đơn nào được phân"}
                                            </div>
                                        )}
                                        {filteredAssigned.map((o) => {
                                            const active = o.assignments.find(
                                                (a) =>
                                                    a.status === "PENDING_ACCEPT" ||
                                                    a.status === "ASSIGNED" ||
                                                    a.status === "PICKED_UP" ||
                                                    a.status === "IN_TRANSIT",
                                            );
                                            const v = active
                                                ? vehicles.find((x) => x.id === active.vehicleId)
                                                : null;
                                            return (
                                                <AssignedOrderCard
                                                    key={o.id}
                                                    order={o}
                                                    customerName={customerName(o.customerId)}
                                                    vehicle={v ?? null}
                                                    canUnassign={active?.status === "ASSIGNED"}
                                                    onUnassign={() => handleUnassign(o)}
                                                    onFocusVehicle={v ? () => focusVehicle(v.id) : undefined}
                                                />
                                            );
                                        })}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {mobileTab === "map" && (
                        <Card className="h-full overflow-hidden">
                            <FleetMapPanel
                                selectedVehicleId={selectedVehicleId}
                                onSelectVehicle={setSelectedVehicleId}
                                className="h-full w-full"
                            />
                        </Card>
                    )}

                    {mobileTab === "vehicles" && (
                        <Card className="h-full flex flex-col">
                            <div className="p-3 border-b">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                    <input
                                        type="text"
                                        value={vehicleSearch}
                                        onChange={(e) => setVehicleSearch(e.target.value)}
                                        placeholder="Tìm biển số, tài xế, loại xe..."
                                        className="w-full rounded-md border bg-background pl-7 pr-7 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    {vehicleSearch && (
                                        <button
                                            onClick={() => setVehicleSearch("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
                                {filteredAvailable.length === 0 && filteredBusy.length === 0 && (
                                    <div className="text-center py-12 text-sm text-muted-foreground">
                                        {vq ? "Không tìm thấy xe phù hợp" : "Không có xe nào"}
                                    </div>
                                )}
                                {filteredAvailable.length > 0 && (
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                        Sẵn sàng ({filteredAvailable.length})
                                    </p>
                                )}
                                {filteredAvailable.map((v) => (
                                    <div
                                        key={v.id}
                                        onClick={() => focusVehicle(v.id)}
                                        className="rounded-md border p-3 text-sm bg-card cursor-pointer hover:border-primary/50 active:bg-primary/5"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-mono font-semibold">
                                                {v.plateNumber}
                                            </p>
                                            <Badge variant="success" className="text-[10px]">
                                                Sẵn sàng
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {v.driverName} • {v.type}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Tải: {formatKg(v.capacityKg)}
                                        </p>
                                    </div>
                                ))}
                                {filteredBusy.length > 0 && (
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3">
                                        Đang chạy ({filteredBusy.length})
                                    </p>
                                )}
                                {filteredBusy.map((v) => (
                                    <div
                                        key={v.id}
                                        onClick={() => focusVehicle(v.id)}
                                        className="rounded-md border bg-muted/40 p-3 text-sm opacity-80 cursor-pointer hover:opacity-100 hover:border-primary/50 active:bg-primary/5"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-mono font-semibold">
                                                {v.plateNumber}
                                            </p>
                                            <Badge variant="default" className="text-[10px]">
                                                {Math.round((v.routeProgress ?? 0) * 100)}%
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {v.driverName}
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* ===== DESKTOP (≥1024px): balanced 3-pane with drag-drop ===== */}
            <div className="hidden lg:flex gap-3 xl:gap-4 h-full">
                {/* ---- LEFT: Orders panel ---- */}
                <aside className="flex flex-col min-h-0 shrink-0 w-72 xl:w-80 2xl:w-96">
                    <Card className="flex flex-col h-full max-h-[calc(100vh-7rem)]">
                        <CardHeader className="pb-2 space-y-2 px-3 pt-3">
                            <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
                                <button
                                    onClick={() => setOrdersTab("pending")}
                                    className={cn(
                                        "flex items-center justify-center gap-1 rounded px-1 py-1.5 text-[11px] xl:text-xs transition whitespace-nowrap",
                                        ordersTab === "pending"
                                            ? "bg-background shadow-sm font-semibold"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <Package className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">Chờ phân</span>
                                    <Badge
                                        variant={ordersTab === "pending" ? "secondary" : "outline"}
                                        className="text-[10px] h-4 px-1 shrink-0"
                                    >
                                        {pendingOrders.length}
                                    </Badge>
                                </button>
                                <button
                                    onClick={() => setOrdersTab("review")}
                                    className={cn(
                                        "flex items-center justify-center gap-1 rounded px-1 py-1.5 text-[11px] xl:text-xs transition whitespace-nowrap",
                                        ordersTab === "review"
                                            ? "bg-background shadow-sm font-semibold"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">Chờ duyệt</span>
                                    <Badge
                                        variant={ordersTab === "review" ? "warning" : "outline"}
                                        className="text-[10px] h-4 px-1 shrink-0"
                                    >
                                        {reviewOrders.length}
                                    </Badge>
                                </button>
                                <button
                                    onClick={() => setOrdersTab("assigned")}
                                    className={cn(
                                        "flex items-center justify-center gap-1 rounded px-1 py-1.5 text-[11px] xl:text-xs transition whitespace-nowrap",
                                        ordersTab === "assigned"
                                            ? "bg-background shadow-sm font-semibold"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">Đã phân</span>
                                    <Badge
                                        variant={ordersTab === "assigned" ? "secondary" : "outline"}
                                        className="text-[10px] h-4 px-1 shrink-0"
                                    >
                                        {assignedOrders.length}
                                    </Badge>
                                </button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm mã đơn, khách, địa chỉ..."
                                    className="w-full rounded-md border bg-background pl-7 pr-7 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            {ordersTab === "pending" && (
                                <>
                                    <div className="flex items-center gap-1.5 rounded-md bg-primary/5 px-2 py-1 text-[10px] text-primary">
                                        <Sparkles className="h-3 w-3 shrink-0" />
                                        <span className="leading-snug">
                                            Tự động điều phối: BẬT — đơn mới được AI phân ngay; mục này chỉ còn đơn cần xử lý tay.
                                        </span>
                                    </div>
                                    {renderAiSection()}
                                    <Button
                                        size="sm"
                                        className="w-full h-8"
                                        disabled={
                                            pendingOrders.length === 0 || availableVehicles.length === 0
                                        }
                                        onClick={() => setAutoOpen(true)}
                                    >
                                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                        Chạy lại AI cho đơn còn lại
                                    </Button>
                                </>
                            )}
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto space-y-2 p-3 pt-1">
                            {ordersTab === "pending" && (
                                <>
                                    {filteredPending.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-4">
                                            {q ? "Không tìm thấy đơn phù hợp" : "Không có đơn chờ"}
                                        </p>
                                    )}
                                    {aiPending.map((o) => {
                                        const ai = aiMode ? analysis?.perOrder.get(o.id) : undefined;
                                        return (
                                            <DraggableOrderCard
                                                key={o.id}
                                                order={o}
                                                customerName={customerName(o.customerId)}
                                                onSuggest={() => setAiOrder(o)}
                                                onAssign={() => setCarrierPickOrder(o)}
                                                ai={ai}
                                                onAiAssign={ai ? () => aiAssign(o, ai) : undefined}
                                            />
                                        );
                                    })}
                                </>
                            )}
                            {ordersTab === "review" && (
                                <>
                                    {filteredReview.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-4">
                                            {q ? "Không tìm thấy đơn phù hợp" : "Không có đơn nào đang chờ duyệt"}
                                        </p>
                                    )}
                                    {filteredReview.map((o) => (
                                        <ReviewOrderCard
                                            key={o.id}
                                            order={o}
                                            customerName={customerName(o.customerId)}
                                            carrierName={
                                                carriers.find((c) => c.id === o.carrierId)?.name ??
                                                "—"
                                            }
                                            canReview={canReview}
                                            onReview={() => setReviewOrder(o)}
                                        />
                                    ))}
                                </>
                            )}
                            {ordersTab === "assigned" && (
                                <>
                                    {filteredAssigned.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-4">
                                            {q ? "Không tìm thấy đơn phù hợp" : "Chưa có đơn nào được phân"}
                                        </p>
                                    )}
                                    {filteredAssigned.map((o) => {
                                        const active = o.assignments.find(
                                            (a) =>
                                                a.status === "PENDING_ACCEPT" ||
                                                a.status === "ASSIGNED" ||
                                                a.status === "PICKED_UP" ||
                                                a.status === "IN_TRANSIT",
                                        );
                                        const v = active
                                            ? vehicles.find((x) => x.id === active.vehicleId)
                                            : null;
                                        return (
                                            <AssignedOrderCard
                                                key={o.id}
                                                order={o}
                                                customerName={customerName(o.customerId)}
                                                vehicle={v ?? null}
                                                canUnassign={active?.status === "ASSIGNED"}
                                                onUnassign={() => handleUnassign(o)}
                                            />
                                        );
                                    })}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </aside>

                {/* ---- CENTER: Map (flex-1, fills remaining space) ---- */}
                <section className="flex-1 min-w-0 min-h-0">
                    <Card className="relative h-full max-h-[calc(100vh-7rem)] overflow-hidden">
                        <FleetMapPanel
                            selectedVehicleId={selectedVehicleId}
                            onSelectVehicle={setSelectedVehicleId}
                            className="h-full w-full"
                        />
                    </Card>
                </section>

                {/* ---- RIGHT: Vehicles panel ---- */}
                <aside className="flex flex-col min-h-0 shrink-0 w-60 xl:w-72 2xl:w-80">
                    <Card className="flex flex-col h-full max-h-[calc(100vh-7rem)]">
                        <CardHeader className="pb-2 px-3 pt-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Truck className="h-4 w-4" /> Xe
                                </CardTitle>
                                <Badge variant="secondary" className="shrink-0">
                                    {availableVehicles.length} sẵn sàng
                                </Badge>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                <input
                                    type="text"
                                    value={vehicleSearch}
                                    onChange={(e) => setVehicleSearch(e.target.value)}
                                    placeholder="Tìm biển số, tài xế, loại xe..."
                                    className="w-full rounded-md border bg-background pl-7 pr-7 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                {vehicleSearch && (
                                    <button
                                        onClick={() => setVehicleSearch("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto space-y-2 p-3 pt-0">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                    Sẵn sàng
                                </p>
                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                    {filteredAvailable.length}
                                </span>
                            </div>
                            {filteredAvailable.length === 0 && vq && (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                    Không tìm thấy xe phù hợp
                                </p>
                            )}
                            {filteredAvailable.map((v) => (
                                <DroppableVehicle
                                    key={v.id}
                                    vehicle={v}
                                    selected={selectedVehicleId === v.id}
                                    onSelect={() => focusVehicle(v.id)}
                                />
                            ))}
                            <div className="flex items-center justify-between mt-3">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                    Đang chạy
                                </p>
                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                    {filteredBusy.length}
                                </span>
                            </div>
                            {filteredBusy.map((v) => (
                                <div
                                    key={v.id}
                                    onClick={() => focusVehicle(v.id)}
                                    className={cn(
                                        "rounded-md border p-2 text-xs cursor-pointer transition",
                                        selectedVehicleId === v.id
                                            ? "border-primary ring-1 ring-primary bg-primary/5"
                                            : "bg-muted/40 opacity-80 hover:opacity-100 hover:border-primary/50",
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-mono font-semibold truncate">
                                            {v.plateNumber}
                                        </p>
                                        <span className="text-[10px] font-medium text-muted-foreground tabular-nums shrink-0">
                                            {Math.round((v.routeProgress ?? 0) * 100)}%
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground truncate">{v.driverName}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </aside>
            </div>

            <AISuggestModal order={aiOrder} open={!!aiOrder} onClose={() => setAiOrder(null)} />
            <AcceptDispatchDialog
                order={acceptCtx?.order ?? null}
                vehicle={acceptCtx?.vehicle ?? null}
                onClose={() => setAcceptCtx(null)}
            />
            <CarrierPickerSheet
                order={carrierPickOrder}
                onClose={() => setCarrierPickOrder(null)}
                onPickCarrier={handlePickCarrier}
            />
            <MobileAssignSheet
                order={assignCtx?.order ?? null}
                carrierId={assignCtx?.carrierId ?? null}
                onClose={() => setAssignCtx(null)}
                onPickVehicle={handlePickVehicleAfterCarrier}
                onBack={() => {
                    if (assignCtx) {
                        setCarrierPickOrder(assignCtx.order);
                        setAssignCtx(null);
                    }
                }}
            />
            <SupervisorReviewDialog order={reviewOrder} onClose={() => setReviewOrder(null)} />
            <AutoDispatchPreviewModal
                orders={pendingOrders}
                open={autoOpen}
                onClose={() => setAutoOpen(false)}
            />
        </DndContext>
    );
}

function ReviewOrderCard({
    order,
    customerName,
    carrierName,
    canReview,
    onReview,
}: {
    order: Order;
    customerName: string;
    carrierName: string;
    canReview: boolean;
    onReview: () => void;
}) {
    const requestedAt = order.supervisorReview?.requestedAt
        ? new Date(order.supervisorReview.requestedAt).toLocaleString("vi-VN")
        : "—";
    return (
        <div className="rounded-md border bg-card p-2.5 text-xs space-y-1.5">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <Link
                        href={`/orders/${order.id}`}
                        className="font-mono font-semibold text-primary hover:underline"
                    >
                        {order.code}
                    </Link>
                    <p className="font-medium truncate">{customerName}</p>
                    <p className="text-muted-foreground truncate text-[10px]">
                        <MapPin className="inline h-3 w-3" /> {order.dropoff.address}
                    </p>
                </div>
                <Badge variant="warning" className="shrink-0 text-[10px]">
                    Chờ giám sát duyệt
                </Badge>
            </div>
            <div className="flex items-center justify-between rounded bg-warning/10 px-2 py-1 text-[10px] text-warning">
                <span className="inline-flex items-center gap-1 truncate">
                    <Clock className="h-3 w-3 shrink-0" />
                    {requestedAt}
                </span>
                <span className="font-medium truncate ml-2">NCC: {carrierName}</span>
            </div>
            {canReview && (
                <button
                    onClick={onReview}
                    className="w-full flex items-center justify-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10"
                >
                    <ShieldCheck className="h-3 w-3" /> Duyệt đơn
                </button>
            )}
        </div>
    );
}

function AssignedOrderCard({
    order,
    customerName,
    vehicle,
    canUnassign,
    onUnassign,
    onFocusVehicle,
}: {
    order: Order;
    customerName: string;
    vehicle: Vehicle | null;
    canUnassign: boolean;
    onUnassign: () => void;
    onFocusVehicle?: () => void;
}) {
    const statusLabel: Record<string, { text: string; tone: "success" | "default" | "warning" }> = {
        DISPATCHED: { text: "Đã phân", tone: "success" },
        PICKED_UP: { text: "Đã lấy hàng", tone: "default" },
        IN_TRANSIT: { text: "Đang giao", tone: "default" },
    };
    const s = statusLabel[order.status] ?? { text: order.status, tone: "default" as const };
    const autoAssigned = order.events.some(
        (e) => e.type === "AUTO_DISPATCHED" || e.type === "DISPATCH_REASSIGNED"
    );

    return (
        <div className="rounded-md border bg-card p-2.5 text-xs space-y-1.5">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <Link
                        href={`/orders/${order.id}`}
                        className="font-mono font-semibold text-primary hover:underline"
                    >
                        {order.code}
                    </Link>
                    <p className="font-medium truncate">{customerName}</p>
                    <p className="text-muted-foreground truncate text-[10px]">
                        <MapPin className="inline h-3 w-3" /> {order.dropoff.address}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={s.tone} className="text-[10px]">
                        {s.text}
                    </Badge>
                    {autoAssigned && order.status === "PENDING_ACCEPT" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                            <Sparkles className="h-2.5 w-2.5" /> AI tự phân
                        </span>
                    )}
                </div>
            </div>
            {vehicle && (
                <button
                    type="button"
                    onClick={onFocusVehicle}
                    className="flex w-full items-center justify-between rounded bg-muted/50 px-2 py-1 text-left transition hover:bg-primary/10"
                    title="Xem xe trên bản đồ"
                >
                    <div className="min-w-0">
                        <p className="font-mono font-semibold flex items-center gap-1">
                            <Truck className="h-3 w-3" /> {vehicle.plateNumber}
                        </p>
                        <p className="text-muted-foreground truncate text-[10px]">
                            {vehicle.driverName}
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground shrink-0 ml-2">
                        {formatKg(order.weightKg)}
                        <MapPin className="h-3 w-3 text-primary" />
                    </span>
                </button>
            )}
            {canUnassign && (
                <button
                    onClick={onUnassign}
                    className="w-full flex items-center justify-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/10"
                >
                    <X className="h-3 w-3" /> Huỷ phân
                </button>
            )}
        </div>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center justify-center gap-1.5 rounded px-2 py-2 transition",
                active
                    ? "bg-background shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground",
            )}
        >
            {children}
        </button>
    );
}

/** Cờ "rớt điều phối" (mức 2/1) khi AI auto không phân được — hiện badge + lý do. */
function DispatchFallbackBadge({ order }: { order: Order }) {
    const fb = order.dispatchFallback;
    if (!fb) return null;
    const label = fb.fromWarning ? "Tài xế cảnh báo — cần phân lại" : "AI chưa phân được xe";
    return (
        <div
            title={fb.reason}
            className="flex items-start gap-1 rounded-md border border-warning bg-warning/10 px-2 py-1 text-[10px] text-warning"
        >
            <AlertTriangle className="h-3 w-3 mt-px shrink-0" />
            <span className="leading-snug">{label}</span>
        </div>
    );
}

function MobileOrderRow({
    order,
    customerName,
    onAssign,
    onSuggest,
    ai,
    onAiAssign,
}: {
    order: Order;
    customerName: string;
    onAssign: () => void;
    onSuggest: () => void;
    ai?: PerOrderAi;
    onAiAssign?: () => void;
}) {
    const fb = order.dispatchFallback;
    return (
        <div className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <Link
                        href={`/orders/${order.id}`}
                        className="font-mono text-sm font-semibold text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {order.code}
                    </Link>
                    <p className="font-medium text-sm truncate">{customerName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-destructive" />
                        <span className="truncate">{order.dropoff.address}</span>
                    </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                    {formatKg(order.weightKg)}
                </Badge>
            </div>
            <DispatchFallbackBadge order={order} />
            {ai && <AIOrderCardOverlay ai={ai} onAssign={onAiAssign} />}
            <div className="flex gap-2">
                <button
                    onClick={onSuggest}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-md px-3 py-2 text-xs font-medium ${
                        fb
                            ? "bg-warning/15 text-warning ring-1 ring-warning hover:bg-warning/25"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                >
                    <Sparkles className="h-3.5 w-3.5" /> AI gợi ý
                </button>
                <button
                    onClick={onAssign}
                    className="flex-1 flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                    Phân xe <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}

function DraggableOrderCard({
    order,
    customerName,
    onSuggest,
    onAssign,
    ai,
    onAiAssign,
}: {
    order: Order;
    customerName: string;
    onSuggest: () => void;
    onAssign: () => void;
    ai?: PerOrderAi;
    onAiAssign?: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: order.id,
    });
    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
        : undefined;
    const fb = order.dispatchFallback;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`rounded-md border bg-card p-2.5 text-xs cursor-grab transition ${
                isDragging
                    ? "shadow-lg"
                    : fb
                      ? "border-warning/60 hover:shadow-sm"
                      : "hover:border-primary hover:shadow-sm"
            }`}
            {...attributes}
            {...listeners}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <Link
                        href={`/orders/${order.id}`}
                        className="font-mono font-semibold text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {order.code}
                    </Link>
                    <p className="font-medium line-clamp-2 leading-snug">{customerName}</p>
                    <p className="text-muted-foreground line-clamp-2 leading-snug text-[10px] mt-0.5">
                        <MapPin className="inline h-3 w-3 mr-0.5" />
                        {order.dropoff.address}
                    </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                    {formatKg(order.weightKg)}
                </Badge>
            </div>
            {fb && (
                <div className="mt-1.5">
                    <DispatchFallbackBadge order={order} />
                </div>
            )}
            {ai && <AIOrderCardOverlay ai={ai} onAssign={onAiAssign} />}
            <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onSuggest();
                    }}
                    className={`flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${
                        fb
                            ? "bg-warning/15 text-warning ring-1 ring-warning hover:bg-warning/25"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Sparkles className="h-3 w-3" /> AI gợi ý
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAssign();
                    }}
                    className="flex items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Hand className="h-3 w-3" /> Phân xe
                </button>
            </div>
        </div>
    );
}

function DroppableVehicle({
    vehicle,
    selected,
    onSelect,
}: {
    vehicle: Vehicle;
    selected?: boolean;
    onSelect?: () => void;
}) {
    const { setNodeRef, isOver, active } = useDroppable({ id: vehicle.id });
    const orders = useDataStore((s) => s.orders);
    const draggingOrder = active ? orders.find((o) => o.id === active.id) : null;
    const wouldOverflow = draggingOrder && draggingOrder.weightKg > vehicle.capacityKg;

    return (
        <div
            ref={setNodeRef}
            onClick={onSelect}
            className={`rounded-md border p-2 text-xs transition cursor-pointer ${
                isOver
                    ? wouldOverflow
                        ? "border-destructive bg-destructive/10"
                        : "border-primary bg-primary/10 shadow-sm"
                    : selected
                      ? "border-primary ring-1 ring-primary bg-primary/5"
                      : "bg-card hover:border-primary/50 hover:shadow-sm"
            }`}
        >
            <div className="flex items-center justify-between gap-2">
                <p className="font-mono font-semibold truncate">{vehicle.plateNumber}</p>
                <Badge variant="success" className="text-[10px] shrink-0">
                    Sẵn sàng
                </Badge>
            </div>
            <p className="text-muted-foreground line-clamp-1 leading-snug">{vehicle.driverName}</p>
            <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                <span className="truncate">Tải: {formatKg(vehicle.capacityKg)}</span>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-medium text-foreground/70">
                    {vehicle.type}
                </span>
            </div>
            {isOver && wouldOverflow && (
                <p className="mt-1 flex items-center gap-1 text-destructive font-medium">
                    <AlertTriangle className="h-3 w-3" /> Vượt tải!
                </p>
            )}
        </div>
    );
}
