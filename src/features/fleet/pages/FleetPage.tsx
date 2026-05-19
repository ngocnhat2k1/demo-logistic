"use client";

import { useState, useMemo } from "react";
import { Topbar } from "@/shared/components/Topbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useDataStore } from "@/shared/stores/data";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { formatKg } from "@/shared/utils";
import {
  Truck,
  ChevronDown,
  Search,
  Building2,
  Link2,
  Plus,
  Pencil,
  Trash2,
  Gauge,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { VehicleStatus, Carrier, Vehicle } from "@/shared/types";
import { CarrierDialog } from "@/features/fleet/components/CarrierDialog";
import { VehicleDialog } from "@/features/fleet/components/VehicleDialog";
import { OdometerDialog } from "@/features/fleet/components/OdometerDialog";
import { formatKm, getMaintenanceInfo } from "@/features/fleet/utils";

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: "Rảnh",
  BUSY: "Đang chạy",
  MAINTENANCE: "Bảo trì",
  BROKEN: "Hỏng",
  OFF_DUTY: "Nghỉ",
};

const VEHICLE_STATUS_VARIANT: Record<
  VehicleStatus,
  "success" | "default" | "warning" | "destructive" | "secondary"
> = {
  AVAILABLE: "success",
  BUSY: "default",
  MAINTENANCE: "warning",
  BROKEN: "destructive",
  OFF_DUTY: "secondary",
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  BOX: "Thùng kín",
  TANK: "Bồn",
  CONTAINER: "Container",
  FLATBED: "Thùng hở",
};

function CarrierTypeBadge({ type }: { type: Carrier["type"] }) {
  if (type === "INTERNAL") {
    return (
      <Badge variant="outline" className="gap-1 text-blue-700 border-blue-300 bg-blue-50">
        <Link2 className="h-3 w-3" />
        Liên kết
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-50">
      <Building2 className="h-3 w-3" />
      Dự phòng
    </Badge>
  );
}

export default function FleetPage() {
  const vehicles = useDataStore((s) => s.vehicles);
  const carriers = useDataStore((s) => s.carriers);
  const setVehicleStatus = useDataStore((s) => s.setVehicleStatus);
  const deleteCarrier = useDataStore((s) => s.deleteCarrier);
  const deleteVehicle = useDataStore((s) => s.deleteVehicle);

  const [carrierDlg, setCarrierDlg] = useState<{
    open: boolean;
    carrier: Carrier | null;
    defaultType: Carrier["type"];
  }>({
    open: false,
    carrier: null,
    defaultType: "BACKUP",
  });
  const [vehicleDlg, setVehicleDlg] = useState<{
    open: boolean;
    vehicle: Vehicle | null;
    defaultCarrierId?: string;
  }>({
    open: false,
    vehicle: null,
  });
  const [odometerDlg, setOdometerDlg] = useState<{ open: boolean; vehicle: Vehicle | null }>({
    open: false,
    vehicle: null,
  });

  function handleDeleteCarrier(c: Carrier) {
    if (!confirm(`Xoá nhà xe ${c.name}?`)) return;
    const r = deleteCarrier(c.id);
    if (!r.ok) toast.error(r.reason ?? "Không thể xoá");
    else toast.success(`Đã xoá nhà xe ${c.name}`);
  }

  function handleDeleteVehicle(v: Vehicle) {
    if (!confirm(`Xoá xe ${v.plateNumber} (${v.driverName})?`)) return;
    const r = deleteVehicle(v.id);
    if (!r.ok) toast.error(r.reason ?? "Không thể xoá");
    else toast.success(`Đã xoá xe ${v.plateNumber}`);
  }

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "ALL">("ALL");
  const [carrierFilter, setCarrierFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INTERNAL" | "BACKUP">("ALL");
  const [maintFilter, setMaintFilter] = useState<"ALL" | "due_soon" | "overdue">("ALL");

  const internalCarriers = useMemo(() => carriers.filter((c) => c.type === "INTERNAL"), [carriers]);
  const backupCarriers = useMemo(() => carriers.filter((c) => c.type === "BACKUP"), [carriers]);

  const carrierMap = useMemo(() => new Map(carriers.map((c) => [c.id, c])), [carriers]);

  // ----- stats -----
  const total = vehicles.length;
  const vAvailable = vehicles.filter((v) => v.status === "AVAILABLE").length;
  const vBusy = vehicles.filter((v) => v.status === "BUSY").length;
  const vBroken = vehicles.filter((v) => v.status === "BROKEN" || v.status === "MAINTENANCE").length;

  const dueSoonCount = vehicles.filter((v) => getMaintenanceInfo(v).state === "due_soon").length;
  const overdueCount = vehicles.filter((v) => getMaintenanceInfo(v).state === "overdue").length;

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      const carrier = carrierMap.get(v.carrierId);
      const matchSearch =
        q === "" ||
        v.plateNumber.toLowerCase().includes(q) ||
        v.driverName.toLowerCase().includes(q) ||
        v.driverPhone.includes(q);
      const matchStatus = statusFilter === "ALL" || v.status === statusFilter;
      const matchCarrier = carrierFilter === "ALL" || v.carrierId === carrierFilter;
      const matchType = typeFilter === "ALL" || carrier?.type === typeFilter;
      const maint = getMaintenanceInfo(v);
      const matchMaint = maintFilter === "ALL" || maint.state === maintFilter;
      return matchSearch && matchStatus && matchCarrier && matchType && matchMaint;
    });
  }, [vehicles, search, statusFilter, carrierFilter, typeFilter, maintFilter, carrierMap]);

  return (
    <>
      <Topbar title="Quản lý Đội xe" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Tổng xe & tài xế" value={total} icon={<Truck className="h-4 w-4" />} />
          <StatCard label="Sẵn sàng" value={vAvailable} color="text-emerald-600" />
          <StatCard label="Đang chạy" value={vBusy} color="text-blue-600" />
          <StatCard label="Hỏng / Bảo trì" value={vBroken} color="text-red-500" />
          <StatCard
            label="Sắp bảo trì"
            value={dueSoonCount}
            icon={<Wrench className="h-4 w-4 text-amber-600" />}
            color="text-amber-700"
          />
          <StatCard
            label="Quá hạn BT"
            value={overdueCount}
            icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
            color="text-red-700"
          />
        </div>

        <Tabs defaultValue="vehicles">
          <TabsList className="w-full grid grid-cols-2 sm:inline-flex sm:w-auto">
            <TabsTrigger value="vehicles" className="text-xs sm:text-sm">
              Xe & Tài xế ({vehicles.length})
            </TabsTrigger>
            <TabsTrigger value="carriers" className="text-xs sm:text-sm">
              Nhà xe ({carriers.length})
            </TabsTrigger>
          </TabsList>

          {/* ===== VEHICLES & DRIVERS (merged) ===== */}
          <TabsContent value="vehicles" className="space-y-3 mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm biển số, tên tài xế, SĐT..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {typeFilter === "ALL"
                      ? "Loại nhà xe"
                      : typeFilter === "INTERNAL"
                        ? "Liên kết"
                        : "Dự phòng"}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setTypeFilter("ALL")}>Tất cả</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("INTERNAL")}>
                    Nhà xe liên kết
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("BACKUP")}>
                    Nhà xe dự phòng
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {statusFilter === "ALL" ? "Trạng thái" : VEHICLE_STATUS_LABELS[statusFilter]}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter("ALL")}>Tất cả</DropdownMenuItem>
                  {(
                    ["AVAILABLE", "BUSY", "MAINTENANCE", "BROKEN", "OFF_DUTY"] as VehicleStatus[]
                  ).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                      {VEHICLE_STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {maintFilter === "ALL"
                      ? "Bảo trì"
                      : maintFilter === "due_soon"
                        ? "Sắp BT"
                        : "Quá hạn BT"}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setMaintFilter("ALL")}>Tất cả</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMaintFilter("due_soon")}>
                    Sắp bảo trì
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMaintFilter("overdue")}>
                    Quá hạn bảo trì
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {carrierFilter === "ALL"
                      ? "Đơn vị"
                      : carriers.find((c) => c.id === carrierFilter)?.code}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setCarrierFilter("ALL")}>
                    Tất cả
                  </DropdownMenuItem>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                    Nhà xe liên kết
                  </div>
                  {internalCarriers.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => setCarrierFilter(c.id)}>
                      {c.code} — {c.name}
                    </DropdownMenuItem>
                  ))}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-1">
                    Nhà xe dự phòng
                  </div>
                  {backupCarriers.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => setCarrierFilter(c.id)}>
                      {c.code} — {c.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="ml-auto self-center text-sm text-muted-foreground">
                {filteredVehicles.length} / {vehicles.length}
              </span>
              <Button size="sm" onClick={() => setVehicleDlg({ open: true, vehicle: null })}>
                <Plus className="h-4 w-4" /> Thêm xe & tài xế
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1100px]">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Biển số</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Loại xe</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Tải</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Tài xế</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">SĐT</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Hạng bằng</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Đơn vị</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Km tích lũy</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">
                          Từ lần BT cuối
                        </th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Bảo trì</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Trạng thái</th>
                        <th className="px-4 py-3 font-medium w-[1%]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVehicles.length === 0 && (
                        <tr>
                          <td
                            colSpan={12}
                            className="px-4 py-8 text-center text-muted-foreground"
                          >
                            Không có xe nào phù hợp
                          </td>
                        </tr>
                      )}
                      {filteredVehicles.map((v) => {
                        const carrier = carrierMap.get(v.carrierId);
                        const maint = getMaintenanceInfo(v);
                        return (
                          <tr
                            key={v.id}
                            className="border-t hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 font-mono font-medium">{v.plateNumber}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {VEHICLE_TYPE_LABELS[v.type] ?? v.type}
                            </td>
                            <td className="px-4 py-3">{formatKg(v.capacityKg)}</td>
                            <td className="px-4 py-3 font-medium">{v.driverName}</td>
                            <td className="px-4 py-3 text-muted-foreground">{v.driverPhone}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">{v.driverLicenseClass}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold w-fit">
                                  {carrier?.code ?? "—"}
                                </span>
                                {carrier && <CarrierTypeBadge type={carrier.type} />}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono whitespace-nowrap">
                              {formatKm(v.odometerKm)}
                            </td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                              {formatKm(maint.kmSinceMaintenance)}
                              <span className="text-muted-foreground">
                                {" "}
                                / {formatKm(v.maintenanceIntervalKm)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {maint.state === "overdue" ? (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Quá hạn
                                </Badge>
                              ) : maint.state === "due_soon" ? (
                                <Badge variant="warning" className="gap-1">
                                  <Wrench className="h-3 w-3" /> Sắp BT
                                </Badge>
                              ) : (
                                <Badge variant="success">Ổn</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="flex items-center gap-1 focus:outline-none">
                                    <Badge variant={VEHICLE_STATUS_VARIANT[v.status]}>
                                      {VEHICLE_STATUS_LABELS[v.status]}
                                    </Badge>
                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {(
                                    [
                                      "AVAILABLE",
                                      "MAINTENANCE",
                                      "BROKEN",
                                      "OFF_DUTY",
                                    ] as VehicleStatus[]
                                  )
                                    .filter((s) => s !== v.status)
                                    .map((s) => (
                                      <DropdownMenuItem
                                        key={s}
                                        onClick={() => setVehicleStatus(v.id, s)}
                                      >
                                        Chuyển → {VEHICLE_STATUS_LABELS[s]}
                                      </DropdownMenuItem>
                                    ))}
                                  {v.status === "BUSY" && (
                                    <DropdownMenuItem
                                      disabled
                                      className="text-muted-foreground text-xs"
                                    >
                                      Đang có chuyến — không thể đổi
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setOdometerDlg({ open: true, vehicle: v })}
                                  aria-label="Lịch sử số km"
                                  title="Lịch sử số km & bảo trì"
                                >
                                  <Gauge className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setVehicleDlg({ open: true, vehicle: v })}
                                  aria-label="Sửa"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteVehicle(v)}
                                  aria-label="Xoá"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== CARRIERS ===== */}
          <TabsContent value="carriers" className="space-y-5 mt-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Nhà xe liên kết</h3>
                <span className="text-xs text-muted-foreground">
                  ({internalCarriers.length} đơn vị — công ty con / liên kết nội bộ)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() =>
                    setCarrierDlg({ open: true, carrier: null, defaultType: "INTERNAL" })
                  }
                >
                  <Plus className="h-4 w-4" /> Thêm
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {internalCarriers.map((carrier) => (
                  <CarrierCard
                    key={carrier.id}
                    carrier={carrier}
                    vehicles={vehicles}
                    onEdit={() =>
                      setCarrierDlg({ open: true, carrier, defaultType: carrier.type })
                    }
                    onDelete={() => handleDeleteCarrier(carrier)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-600" />
                <h3 className="font-semibold text-amber-800">Nhà xe dự phòng</h3>
                <span className="text-xs text-muted-foreground">
                  ({backupCarriers.length} đơn vị — đối tác bên thứ 3)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() =>
                    setCarrierDlg({ open: true, carrier: null, defaultType: "BACKUP" })
                  }
                >
                  <Plus className="h-4 w-4" /> Thêm
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {backupCarriers.map((carrier) => (
                  <CarrierCard
                    key={carrier.id}
                    carrier={carrier}
                    vehicles={vehicles}
                    onEdit={() =>
                      setCarrierDlg({ open: true, carrier, defaultType: carrier.type })
                    }
                    onDelete={() => handleDeleteCarrier(carrier)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CarrierDialog
        open={carrierDlg.open}
        onOpenChange={(o) => setCarrierDlg((s) => ({ ...s, open: o }))}
        carrier={carrierDlg.carrier}
        defaultType={carrierDlg.defaultType}
      />
      <VehicleDialog
        open={vehicleDlg.open}
        onOpenChange={(o) => setVehicleDlg((s) => ({ ...s, open: o }))}
        vehicle={vehicleDlg.vehicle}
        defaultCarrierId={vehicleDlg.defaultCarrierId}
      />
      <OdometerDialog
        open={odometerDlg.open}
        onOpenChange={(o) => setOdometerDlg((s) => ({ ...s, open: o }))}
        vehicle={odometerDlg.vehicle}
      />
    </>
  );
}

function CarrierCard({
  carrier,
  vehicles,
  onEdit,
  onDelete,
}: {
  carrier: Carrier;
  vehicles: Vehicle[];
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const cVehicles = vehicles.filter((v) => v.carrierId === carrier.id);
  const cAvailable = cVehicles.filter((v) => v.status === "AVAILABLE").length;
  const cBusy = cVehicles.filter((v) => v.status === "BUSY").length;
  const dueSoon = cVehicles.filter((v) => getMaintenanceInfo(v).state === "due_soon").length;
  const overdue = cVehicles.filter((v) => getMaintenanceInfo(v).state === "overdue").length;

  return (
    <Card className={carrier.type === "INTERNAL" ? "border-blue-200" : "border-amber-200"}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{carrier.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{carrier.contactPhone}</p>
          </div>
          <span className="rounded font-bold text-sm px-2 py-0.5 bg-muted">{carrier.code}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <CarrierTypeBadge type={carrier.type} />
          {(onEdit || onDelete) && (
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onEdit}
                  aria-label="Sửa"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={onDelete}
                  aria-label="Xoá"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Xe & tài xế</span>
          <span className="font-medium text-foreground">
            {cVehicles.length} — {cAvailable} rảnh · {cBusy} đang chạy
          </span>
        </div>
        {(dueSoon > 0 || overdue > 0) && (
          <div className="flex justify-between text-muted-foreground">
            <span>Bảo trì</span>
            <span className="font-medium text-foreground">
              {overdue > 0 && <span className="text-destructive">{overdue} quá hạn</span>}
              {overdue > 0 && dueSoon > 0 && " · "}
              {dueSoon > 0 && <span className="text-warning">{dueSoon} sắp BT</span>}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          {icon}
          {label}
        </p>
        <p className={`text-2xl font-bold ${color ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
