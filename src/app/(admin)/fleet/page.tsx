"use client";

import { useState, useMemo } from "react";
import { Topbar } from "@/components/shared/Topbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useDataStore } from "@/lib/stores/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatKg } from "@/lib/utils";
import { Truck, Users, ChevronDown, Search } from "lucide-react";
import type { VehicleStatus, DriverStatus } from "@/types";

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

export default function FleetPage() {
  const vehicles = useDataStore((s) => s.vehicles);
  const drivers = useDataStore((s) => s.drivers);
  const carriers = useDataStore((s) => s.carriers);
  const setVehicleStatus = useDataStore((s) => s.setVehicleStatus);
  const setDriverStatus = useDataStore((s) => s.setDriverStatus);

  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<VehicleStatus | "ALL">("ALL");
  const [vehicleCarrierFilter, setVehicleCarrierFilter] = useState<string>("ALL");

  const [driverSearch, setDriverSearch] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] = useState<DriverStatus | "ALL">("ALL");
  const [driverCarrierFilter, setDriverCarrierFilter] = useState<string>("ALL");

  // --- vehicle stats ---
  const vAvailable = vehicles.filter((v) => v.status === "AVAILABLE").length;
  const vBusy = vehicles.filter((v) => v.status === "BUSY").length;
  const vBroken = vehicles.filter((v) => v.status === "BROKEN" || v.status === "MAINTENANCE").length;

  // --- driver stats ---
  const dAvailable = drivers.filter((d) => d.status === "AVAILABLE").length;
  const dBusy = drivers.filter((d) => d.status === "BUSY").length;

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        vehicleSearch === "" ||
        v.plateNumber.toLowerCase().includes(vehicleSearch.toLowerCase());
      const matchStatus = vehicleStatusFilter === "ALL" || v.status === vehicleStatusFilter;
      const matchCarrier = vehicleCarrierFilter === "ALL" || v.carrierId === vehicleCarrierFilter;
      return matchSearch && matchStatus && matchCarrier;
    });
  }, [vehicles, vehicleSearch, vehicleStatusFilter, vehicleCarrierFilter]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchSearch =
        driverSearch === "" ||
        d.fullName.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.phone.includes(driverSearch);
      const matchStatus = driverStatusFilter === "ALL" || d.status === driverStatusFilter;
      const matchCarrier = driverCarrierFilter === "ALL" || d.carrierId === driverCarrierFilter;
      return matchSearch && matchStatus && matchCarrier;
    });
  }, [drivers, driverSearch, driverStatusFilter, driverCarrierFilter]);

  return (
    <>
      <Topbar title="Quản lý Đội xe" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Tổng xe" value={vehicles.length} icon={<Truck className="h-4 w-4" />} />
          <StatCard label="Xe rảnh" value={vAvailable} color="text-emerald-600" />
          <StatCard label="Đang chạy" value={vBusy} color="text-blue-600" />
          <StatCard label="Hỏng / Bảo trì" value={vBroken} color="text-red-500" />
          <StatCard label="Tổng tài xế" value={drivers.length} icon={<Users className="h-4 w-4" />} />
        </div>

        <Tabs defaultValue="vehicles">
          <TabsList>
            <TabsTrigger value="vehicles">Xe ({vehicles.length})</TabsTrigger>
            <TabsTrigger value="drivers">Tài xế ({drivers.length})</TabsTrigger>
          </TabsList>

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
                  {carriers.map((c) => (
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
                      <th className="px-4 py-3 font-medium">Tài xế</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          Không có xe nào phù hợp
                        </td>
                      </tr>
                    )}
                    {filteredVehicles.map((v) => {
                      const carrier = carriers.find((c) => c.id === v.carrierId);
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
                                  <DropdownMenuItem
                                    key={s}
                                    onClick={() => setVehicleStatus(v.id, s)}
                                  >
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
                  {carriers.map((c) => (
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
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          Không có tài xế nào phù hợp
                        </td>
                      </tr>
                    )}
                    {filteredDrivers.map((d) => {
                      const v = vehicles.find((x) => x.id === d.currentVehicleId);
                      const carrier = carriers.find((c) => c.id === d.carrierId);
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
                                  <DropdownMenuItem
                                    key={s}
                                    onClick={() => setDriverStatus(d.id, s)}
                                  >
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
