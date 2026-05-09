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
import { Truck, ChevronDown, Search, Building2, Link2 } from "lucide-react";
import type { VehicleStatus, DriverStatus, Carrier } from "@/shared/types";

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: "Rảnh",
  BUSY: "Đang chạy",
  MAINTENANCE: "Bảo trì",
  BROKEN: "Hỏng",
};

const VEHICLE_STATUS_VARIANT: Record<VehicleStatus, "success" | "default" | "warning" | "destructive"> = {
  AVAILABLE: "success",
  BUSY: "default",
  MAINTENANCE: "warning",
  BROKEN: "destructive",
};

const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  AVAILABLE: "Rảnh",
  BUSY: "Đang chạy",
  OFF_DUTY: "Nghỉ",
};

const DRIVER_STATUS_VARIANT: Record<DriverStatus, "success" | "default" | "secondary"> = {
  AVAILABLE: "success",
  BUSY: "default",
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
  const drivers = useDataStore((s) => s.drivers);
  const carriers = useDataStore((s) => s.carriers);
  const setVehicleStatus = useDataStore((s) => s.setVehicleStatus);
  const setDriverStatus = useDataStore((s) => s.setDriverStatus);

  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<VehicleStatus | "ALL">("ALL");
  const [vehicleCarrierFilter, setVehicleCarrierFilter] = useState<string>("ALL");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<"ALL" | "INTERNAL" | "BACKUP">("ALL");

  const [driverSearch, setDriverSearch] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] = useState<DriverStatus | "ALL">("ALL");
  const [driverCarrierFilter, setDriverCarrierFilter] = useState<string>("ALL");
  const [driverTypeFilter, setDriverTypeFilter] = useState<"ALL" | "INTERNAL" | "BACKUP">("ALL");

  const internalCarriers = useMemo(() => carriers.filter((c) => c.type === "INTERNAL"), [carriers]);
  const backupCarriers = useMemo(() => carriers.filter((c) => c.type === "BACKUP"), [carriers]);

  const carrierMap = useMemo(() => new Map(carriers.map((c) => [c.id, c])), [carriers]);

  // --- vehicle stats ---
  const vAvailable = vehicles.filter((v) => v.status === "AVAILABLE").length;
  const vBusy = vehicles.filter((v) => v.status === "BUSY").length;
  const vBroken = vehicles.filter((v) => v.status === "BROKEN" || v.status === "MAINTENANCE").length;
  const vInternal = vehicles.filter((v) => carrierMap.get(v.carrierId)?.type === "INTERNAL").length;
  const vBackup = vehicles.filter((v) => carrierMap.get(v.carrierId)?.type === "BACKUP").length;

  // --- driver stats ---
  const dAvailable = drivers.filter((d) => d.status === "AVAILABLE").length;
  const dBusy = drivers.filter((d) => d.status === "BUSY").length;

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const carrier = carrierMap.get(v.carrierId);
      const matchSearch =
        vehicleSearch === "" || v.plateNumber.toLowerCase().includes(vehicleSearch.toLowerCase());
      const matchStatus = vehicleStatusFilter === "ALL" || v.status === vehicleStatusFilter;
      const matchCarrier = vehicleCarrierFilter === "ALL" || v.carrierId === vehicleCarrierFilter;
      const matchType = vehicleTypeFilter === "ALL" || carrier?.type === vehicleTypeFilter;
      return matchSearch && matchStatus && matchCarrier && matchType;
    });
  }, [vehicles, vehicleSearch, vehicleStatusFilter, vehicleCarrierFilter, vehicleTypeFilter, carrierMap]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const carrier = carrierMap.get(d.carrierId);
      const matchSearch =
        driverSearch === "" ||
        d.fullName.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.phone.includes(driverSearch);
      const matchStatus = driverStatusFilter === "ALL" || d.status === driverStatusFilter;
      const matchCarrier = driverCarrierFilter === "ALL" || d.carrierId === driverCarrierFilter;
      const matchType = driverTypeFilter === "ALL" || carrier?.type === driverTypeFilter;
      return matchSearch && matchStatus && matchCarrier && matchType;
    });
  }, [drivers, driverSearch, driverStatusFilter, driverCarrierFilter, driverTypeFilter, carrierMap]);

  return (
    <>
      <Topbar title="Quản lý Đội xe" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard label="Tổng xe" value={vehicles.length} icon={<Truck className="h-4 w-4" />} />
          <StatCard label="Xe rảnh" value={vAvailable} color="text-emerald-600" />
          <StatCard label="Đang chạy" value={vBusy} color="text-blue-600" />
          <StatCard label="Hỏng / Bảo trì" value={vBroken} color="text-red-500" />
          <StatCard
            label="Nhà xe liên kết"
            value={vInternal}
            icon={<Link2 className="h-4 w-4 text-blue-600" />}
            color="text-blue-700"
          />
          <StatCard
            label="Nhà xe dự phòng"
            value={vBackup}
            icon={<Building2 className="h-4 w-4 text-amber-600" />}
            color="text-amber-700"
          />
        </div>

        <Tabs defaultValue="carriers">
          <TabsList>
            <TabsTrigger value="carriers">Nhà xe ({carriers.length})</TabsTrigger>
            <TabsTrigger value="vehicles">Xe ({vehicles.length})</TabsTrigger>
            <TabsTrigger value="drivers">Tài xế ({drivers.length})</TabsTrigger>
          </TabsList>

          {/* ===== CARRIERS ===== */}
          <TabsContent value="carriers" className="space-y-5 mt-3">
            {/* Nhà xe liên kết */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Nhà xe liên kết</h3>
                <span className="text-xs text-muted-foreground">({internalCarriers.length} đơn vị — công ty con / liên kết nội bộ)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {internalCarriers.map((carrier) => (
                  <CarrierCard key={carrier.id} carrier={carrier} vehicles={vehicles} drivers={drivers} />
                ))}
              </div>
            </div>

            {/* Nhà xe dự phòng */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-600" />
                <h3 className="font-semibold text-amber-800">Nhà xe dự phòng</h3>
                <span className="text-xs text-muted-foreground">({backupCarriers.length} đơn vị — đối tác bên thứ 3)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {backupCarriers.map((carrier) => (
                  <CarrierCard key={carrier.id} carrier={carrier} vehicles={vehicles} drivers={drivers} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ===== VEHICLES ===== */}
          <TabsContent value="vehicles" className="space-y-3 mt-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm biển số..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>

              {/* Loại nhà xe */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {vehicleTypeFilter === "ALL"
                      ? "Loại nhà xe"
                      : vehicleTypeFilter === "INTERNAL"
                        ? "Liên kết"
                        : "Dự phòng"}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setVehicleTypeFilter("ALL")}>Tất cả</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setVehicleTypeFilter("INTERNAL")}>Nhà xe liên kết</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setVehicleTypeFilter("BACKUP")}>Nhà xe dự phòng</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {vehicleStatusFilter === "ALL" ? "Trạng thái" : VEHICLE_STATUS_LABELS[vehicleStatusFilter]}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setVehicleStatusFilter("ALL")}>Tất cả</DropdownMenuItem>
                  {(["AVAILABLE", "BUSY", "MAINTENANCE", "BROKEN"] as VehicleStatus[]).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => setVehicleStatusFilter(s)}>
                      {VEHICLE_STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {vehicleCarrierFilter === "ALL"
                      ? "Đơn vị"
                      : carriers.find((c) => c.id === vehicleCarrierFilter)?.code}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setVehicleCarrierFilter("ALL")}>Tất cả</DropdownMenuItem>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Nhà xe liên kết</div>
                  {internalCarriers.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => setVehicleCarrierFilter(c.id)}>
                      {c.code} — {c.name}
                    </DropdownMenuItem>
                  ))}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-1">Nhà xe dự phòng</div>
                  {backupCarriers.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => setVehicleCarrierFilter(c.id)}>
                      {c.code} — {c.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="ml-auto self-center text-sm text-muted-foreground">
                {filteredVehicles.length} / {vehicles.length} xe
              </span>
            </div>

            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Biển số</th>
                      <th className="px-4 py-3 font-medium">Loại xe</th>
                      <th className="px-4 py-3 font-medium">Tải trọng</th>
                      <th className="px-4 py-3 font-medium">Đơn vị</th>
                      <th className="px-4 py-3 font-medium">Loại NX</th>
                      <th className="px-4 py-3 font-medium">Tài xế</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          Không có xe nào phù hợp
                        </td>
                      </tr>
                    )}
                    {filteredVehicles.map((v) => {
                      const carrier = carrierMap.get(v.carrierId);
                      const driver = drivers.find((d) => d.id === v.currentDriverId);
                      return (
                        <tr key={v.id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium">{v.plateNumber}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {VEHICLE_TYPE_LABELS[v.type] ?? v.type}
                          </td>
                          <td className="px-4 py-3">{formatKg(v.capacityKg)}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                              {carrier?.code ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {carrier ? <CarrierTypeBadge type={carrier.type} /> : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {driver ? driver.fullName : <span className="text-muted-foreground">—</span>}
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
                                {(["AVAILABLE", "MAINTENANCE", "BROKEN"] as VehicleStatus[]).filter(
                                  (s) => s !== v.status
                                ).map((s) => (
                                  <DropdownMenuItem key={s} onClick={() => setVehicleStatus(v.id, s)}>
                                    Chuyển → {VEHICLE_STATUS_LABELS[s]}
                                  </DropdownMenuItem>
                                ))}
                                {v.status === "BUSY" && (
                                  <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                                    Đang có chuyến — không thể đổi
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== DRIVERS ===== */}
          <TabsContent value="drivers" className="space-y-3 mt-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tên / SĐT..."
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>

              {/* Loại nhà xe */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {driverTypeFilter === "ALL"
                      ? "Loại nhà xe"
                      : driverTypeFilter === "INTERNAL"
                        ? "Liên kết"
                        : "Dự phòng"}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setDriverTypeFilter("ALL")}>Tất cả</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDriverTypeFilter("INTERNAL")}>Nhà xe liên kết</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDriverTypeFilter("BACKUP")}>Nhà xe dự phòng</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {driverStatusFilter === "ALL" ? "Trạng thái" : DRIVER_STATUS_LABELS[driverStatusFilter]}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setDriverStatusFilter("ALL")}>Tất cả</DropdownMenuItem>
                  {(["AVAILABLE", "BUSY", "OFF_DUTY"] as DriverStatus[]).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => setDriverStatusFilter(s)}>
                      {DRIVER_STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {driverCarrierFilter === "ALL"
                      ? "Đơn vị"
                      : carriers.find((c) => c.id === driverCarrierFilter)?.code}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setDriverCarrierFilter("ALL")}>Tất cả</DropdownMenuItem>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Nhà xe liên kết</div>
                  {internalCarriers.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => setDriverCarrierFilter(c.id)}>
                      {c.code} — {c.name}
                    </DropdownMenuItem>
                  ))}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-1">Nhà xe dự phòng</div>
                  {backupCarriers.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => setDriverCarrierFilter(c.id)}>
                      {c.code} — {c.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="ml-auto self-center text-sm text-muted-foreground">
                {filteredDrivers.length} / {drivers.length} tài xế
                {" · "}{dAvailable} rảnh · {dBusy} đang chạy
              </span>
            </div>

            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Tên tài xế</th>
                      <th className="px-4 py-3 font-medium">SĐT</th>
                      <th className="px-4 py-3 font-medium">Hạng bằng</th>
                      <th className="px-4 py-3 font-medium">Xe đang dùng</th>
                      <th className="px-4 py-3 font-medium">Đơn vị</th>
                      <th className="px-4 py-3 font-medium">Loại NX</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          Không có tài xế nào phù hợp
                        </td>
                      </tr>
                    )}
                    {filteredDrivers.map((d) => {
                      const v = vehicles.find((x) => x.id === d.currentVehicleId);
                      const carrier = carrierMap.get(d.carrierId);
                      return (
                        <tr key={d.id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{d.fullName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{d.phone}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{d.licenseClass}</Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {v ? v.plateNumber : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                              {carrier?.code ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {carrier ? <CarrierTypeBadge type={carrier.type} /> : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-1 focus:outline-none">
                                  <Badge variant={DRIVER_STATUS_VARIANT[d.status]}>
                                    {DRIVER_STATUS_LABELS[d.status]}
                                  </Badge>
                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {(["AVAILABLE", "BUSY", "OFF_DUTY"] as DriverStatus[]).filter(
                                  (s) => s !== d.status
                                ).map((s) => (
                                  <DropdownMenuItem key={s} onClick={() => setDriverStatus(d.id, s)}>
                                    Chuyển → {DRIVER_STATUS_LABELS[s]}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function CarrierCard({
  carrier,
  vehicles,
  drivers,
}: {
  carrier: Carrier;
  vehicles: ReturnType<typeof useDataStore.getState>["vehicles"];
  drivers: ReturnType<typeof useDataStore.getState>["drivers"];
}) {
  const cVehicles = vehicles.filter((v) => v.carrierId === carrier.id);
  const cDrivers = drivers.filter((d) => d.carrierId === carrier.id);
  const cAvailable = cVehicles.filter((v) => v.status === "AVAILABLE").length;
  const cBusy = cVehicles.filter((v) => v.status === "BUSY").length;

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
        <div className="mt-1">
          <CarrierTypeBadge type={carrier.type} />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Xe</span>
          <span className="font-medium text-foreground">{cVehicles.length} xe — {cAvailable} rảnh · {cBusy} đang chạy</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Tài xế</span>
          <span className="font-medium text-foreground">{cDrivers.length} người</span>
        </div>
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
