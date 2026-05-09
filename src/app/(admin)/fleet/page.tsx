"use client";

import { Topbar } from "@/components/shared/Topbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDataStore } from "@/lib/stores/data";
import { Badge } from "@/components/ui/badge";
import { formatKg } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function FleetPage() {
  const vehicles = useDataStore((s) => s.vehicles);
  const drivers = useDataStore((s) => s.drivers);
  const carriers = useDataStore((s) => s.carriers);

  return (
    <>
      <Topbar title="Đội xe" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <Tabs defaultValue="vehicles">
          <TabsList>
            <TabsTrigger value="vehicles">Xe ({vehicles.length})</TabsTrigger>
            <TabsTrigger value="drivers">Tài xế ({drivers.length})</TabsTrigger>
            <TabsTrigger value="carriers">Nhà xe ({carriers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Biển số</th>
                      <th className="px-4 py-3 font-medium">Loại</th>
                      <th className="px-4 py-3 font-medium">Tải trọng</th>
                      <th className="px-4 py-3 font-medium">Nhà xe</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                      <th className="px-4 py-3 font-medium">Cập nhật GPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v) => {
                      const carrier = carriers.find((c) => c.id === v.carrierId);
                      return (
                        <tr key={v.id} className="border-t">
                          <td className="px-4 py-3 font-mono">{v.plateNumber}</td>
                          <td className="px-4 py-3">{v.type}</td>
                          <td className="px-4 py-3">{formatKg(v.capacityKg)}</td>
                          <td className="px-4 py-3">{carrier?.code}</td>
                          <td className="px-4 py-3">
                            <Badge variant={
                              v.status === "AVAILABLE" ? "success" :
                              v.status === "BUSY" ? "default" :
                              v.status === "MAINTENANCE" ? "warning" : "destructive"
                            }>
                              {v.status === "AVAILABLE" ? "Sẵn sàng" :
                               v.status === "BUSY" ? "Đang chạy" :
                               v.status === "MAINTENANCE" ? "Bảo trì" : "Hỏng"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {v.lastGpsUpdate ? format(new Date(v.lastGpsUpdate), "HH:mm:ss", { locale: vi }) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drivers">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Tên</th>
                      <th className="px-4 py-3 font-medium">SĐT</th>
                      <th className="px-4 py-3 font-medium">Hạng bằng</th>
                      <th className="px-4 py-3 font-medium">Xe</th>
                      <th className="px-4 py-3 font-medium">Nhà xe</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((d) => {
                      const v = vehicles.find((x) => x.id === d.currentVehicleId);
                      const carrier = carriers.find((c) => c.id === d.carrierId);
                      return (
                        <tr key={d.id} className="border-t">
                          <td className="px-4 py-3 font-medium">{d.fullName}</td>
                          <td className="px-4 py-3">{d.phone}</td>
                          <td className="px-4 py-3"><Badge variant="outline">{d.licenseClass}</Badge></td>
                          <td className="px-4 py-3 font-mono text-xs">{v?.plateNumber || "—"}</td>
                          <td className="px-4 py-3">{carrier?.code}</td>
                          <td className="px-4 py-3">
                            <Badge variant={
                              d.status === "AVAILABLE" ? "success" : d.status === "BUSY" ? "default" : "secondary"
                            }>
                              {d.status === "AVAILABLE" ? "Sẵn sàng" : d.status === "BUSY" ? "Đang chạy" : "Nghỉ"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="carriers">
            <div className="grid gap-3 md:grid-cols-2">
              {carriers.map((c) => {
                const fleet = vehicles.filter((v) => v.carrierId === c.id);
                const dvs = drivers.filter((d) => d.carrierId === c.id);
                return (
                  <Card key={c.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{c.name}</CardTitle>
                          <CardDescription>{c.code} • {c.contactPhone}</CardDescription>
                        </div>
                        <Badge variant={c.type === "INTERNAL" ? "default" : "secondary"}>
                          {c.type === "INTERNAL" ? "Nội bộ" : "Dự phòng"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-md bg-muted p-3">
                          <p className="text-xs text-muted-foreground">Số xe</p>
                          <p className="text-2xl font-bold">{fleet.length}</p>
                        </div>
                        <div className="rounded-md bg-muted p-3">
                          <p className="text-xs text-muted-foreground">Số tài xế</p>
                          <p className="text-2xl font-bold">{dvs.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
