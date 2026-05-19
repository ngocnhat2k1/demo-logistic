"use client";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { useDataStore } from "@/shared/stores/data";
import { Package, Truck, Users, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { quotaLevelColor } from "@/features/orders/domain/quota";
import { Progress } from "@/shared/ui/progress";
import Link from "next/link";

export default function DashboardPage() {
  const orders = useDataStore((s) => s.orders);
  const vehicles = useDataStore((s) => s.vehicles);
  const customers = useDataStore((s) => s.customers);

  const newCount = orders.filter((o) => o.status === "NEW" || o.status === "PENDING_DISPATCH").length;
  const inTransit = orders.filter((o) => ["DISPATCHED", "PICKED_UP", "IN_TRANSIT"].includes(o.status)).length;
  const delivered = orders.filter((o) => o.status === "DELIVERED").length;
  const failed = orders.filter((o) => o.status === "DELIVERY_FAILED" || o.status === "RETURN_PROCESSING").length;
  const availableVehicles = vehicles.filter((v) => v.status === "AVAILABLE").length;
  const busyVehicles = vehicles.filter((v) => v.status === "BUSY").length;

  // Chart 1: orders per day (last 7)
  const days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(new Date(), 6 - i)));
  const chartData = days.map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const dayOrders = orders.filter((o) => {
      const oc = new Date(o.createdAt);
      return oc >= d && oc < next;
    });
    return {
      day: format(d, "dd/MM", { locale: vi }),
      total: dayOrders.length,
      delivered: dayOrders.filter((o) => o.status === "DELIVERED").length,
    };
  });

  // Chart 2: top drivers by completed orders (1 vehicle = 1 driver)
  const vehicleCounts = new Map<string, number>();
  orders.forEach((o) => {
    if (o.status === "DELIVERED") {
      o.assignments.forEach((a) => {
        vehicleCounts.set(a.vehicleId, (vehicleCounts.get(a.vehicleId) ?? 0) + 1);
      });
    }
  });
  const topDrivers = vehicles
    .map((v) => ({
      name: v.driverName.split(" ").slice(-2).join(" "),
      count: vehicleCounts.get(v.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Chart 3: top customers by quota usage
  const topQuotaCustomers = [...customers]
    .filter((c) => c.quota.type !== "POSTPAID" && c.quota.limit > 0)
    .map((c) => ({
      ...c,
      ratio: ((c.quota.reserved ?? 0) + c.quota.used) / c.quota.limit,
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 8);

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 auto-rows-fr">
          <KpiCard title="Đơn chờ điều phối" value={newCount} icon={Clock} accent="warn" href="/orders?status=NEW" />
          <KpiCard title="Đang vận chuyển" value={inTransit} icon={Truck} accent="info" href="/dispatch" />
          <KpiCard title="Đã giao thành công" value={delivered} icon={CheckCircle2} accent="ok" href="/orders?status=DELIVERED" />
          <KpiCard title="Cần xử lý" value={failed} icon={AlertTriangle} accent="danger" href="/returns" />
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <Card className="lg:col-span-2 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg">Đơn hàng 7 ngày qua</CardTitle>
              <CardDescription>Tổng đơn nhận vs đơn đã giao</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 h-64 md:h-72 px-2 md:px-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="hsl(217 91% 45%)" strokeWidth={2} name="Tổng đơn" />
                  <Line type="monotone" dataKey="delivered" stroke="hsl(142 71% 45%)" strokeWidth={2} name="Đã giao" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg">Đội xe</CardTitle>
              <CardDescription>{availableVehicles} sẵn sàng / {busyVehicles} đang chạy</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              <Stat label="Xe & tài xế" value={vehicles.length} icon={<Truck className="h-4 w-4" />} />
              <Stat label="Đang chạy" value={busyVehicles} icon={<Users className="h-4 w-4" />} />
              <Stat label="Tổng khách hàng" value={customers.length} icon={<Package className="h-4 w-4" />} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg">Hiệu suất tài xế (Top 8)</CardTitle>
              <CardDescription>Số đơn đã giao thành công</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 h-64 px-2 md:px-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDrivers} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(217 91% 45%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg">Hạn mức KH (Top 8)</CardTitle>
              <CardDescription>% đã sử dụng</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {topQuotaCustomers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Chưa có dữ liệu</p>
              )}
              {topQuotaCustomers.map((c) => {
                const lvl = quotaLevelColor(c.quota);
                return (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm gap-2">
                      <span className="truncate font-medium min-w-0">{c.name}</span>
                      <span className={
                        lvl === "danger" ? "text-destructive font-semibold shrink-0" :
                        lvl === "warn" ? "text-warning font-semibold shrink-0" : "text-muted-foreground shrink-0"
                      }>
                        {Math.round(c.ratio * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, c.ratio * 100)}
                      indicatorClassName={
                        lvl === "danger" ? "bg-destructive" : lvl === "warn" ? "bg-warning" : "bg-primary"
                      }
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  accent,
  href,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  accent: "info" | "ok" | "warn" | "danger";
  href?: string;
}) {
  const palette: Record<string, string> = {
    info: "bg-blue-50 text-blue-600",
    ok: "bg-emerald-50 text-emerald-600",
    warn: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
  };
  const Wrapper = href ? Link : "div";
  return (
    <Wrapper href={href ?? "#"} className="block h-full">
      <Card className="hover:shadow-md transition cursor-pointer h-full">
        <CardContent className="p-3 md:p-4 flex items-center gap-3 h-full">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${palette[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">{title}</p>
            <p className="text-xl md:text-2xl font-bold leading-tight mt-0.5">{value}</p>
          </div>
        </CardContent>
      </Card>
    </Wrapper>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-background p-3">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon} {label}
      </span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}
