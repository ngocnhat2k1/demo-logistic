"use client";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { useDataStore } from "@/shared/stores/data";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, Tooltip, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#dc2626", "#7c3aed"];

export default function ReportsPage() {
  const orders = useDataStore((s) => s.orders);
  const drivers = useDataStore((s) => s.drivers);
  const customers = useDataStore((s) => s.customers);

  const days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(new Date(), 6 - i)));
  const ordersPerDay = days.map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const dayOrders = orders.filter((o) => {
      const oc = new Date(o.createdAt);
      return oc >= d && oc < next;
    });
    return {
      day: format(d, "dd/MM"),
      total: dayOrders.length,
      delivered: dayOrders.filter((o) => o.status === "DELIVERED").length,
      failed: dayOrders.filter((o) => o.status === "DELIVERY_FAILED" || o.status === "RETURN_PROCESSING").length,
    };
  });

  const driverCounts = new Map<string, number>();
  orders.forEach((o) => {
    if (o.status === "DELIVERED") {
      o.assignments.forEach((a) => driverCounts.set(a.driverId, (driverCounts.get(a.driverId) ?? 0) + 1));
    }
  });
  const topDrivers = drivers
    .map((d) => ({ name: d.fullName.split(" ").slice(-2).join(" "), count: driverCounts.get(d.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Status distribution
  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const customerRows = [...customers]
    .map((c) => ({ ...c, ratio: c.quota.limit ? c.quota.used / c.quota.limit : 0 }))
    .sort((a, b) => b.ratio - a.ratio);

  return (
    <>
      <Topbar title="Báo cáo" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">Đơn hàng 7 ngày qua</CardTitle>
            <CardDescription>Tổng / Đã giao / Thất bại theo ngày</CardDescription>
          </CardHeader>
          <CardContent className="h-64 md:h-80 px-2 md:px-6">
            <ResponsiveContainer>
              <LineChart data={ordersPerDay} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} name="Tổng đơn" />
                <Line type="monotone" dataKey="delivered" stroke="#16a34a" strokeWidth={2} name="Đã giao" />
                <Line type="monotone" dataKey="failed" stroke="#dc2626" strokeWidth={2} name="Thất bại" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg">Top 10 tài xế</CardTitle>
              <CardDescription>Số đơn đã giao thành công</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 h-72 md:h-80 px-2 md:px-6">
              <ResponsiveContainer>
                <BarChart data={topDrivers} layout="vertical" margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg">Phân bố trạng thái</CardTitle>
              <CardDescription>Tổng số đơn theo trạng thái</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 h-72 md:h-80 px-2 md:px-6">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="75%" label={{ fontSize: 10 }}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">Khách hàng — Sử dụng hạn mức</CardTitle>
          </CardHeader>

          {/* Mobile cards */}
          <CardContent className="md:hidden p-3 space-y-2">
            {customerRows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Chưa có dữ liệu</p>
            )}
            {customerRows.map((c) => (
              <div key={c.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{c.name}</span>
                  <span
                    className={`shrink-0 font-semibold ${c.ratio >= 1 ? "text-destructive" : c.ratio >= 0.85 ? "text-warning" : ""}`}
                  >
                    {Math.round(c.ratio * 100)}%
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3">
                  <span>{c.quota.type}</span>
                  <span>{c.quota.used.toLocaleString()} / {c.quota.limit.toLocaleString()} kg</span>
                </div>
              </div>
            ))}
          </CardContent>

          {/* Desktop table */}
          <CardContent className="hidden md:block p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Khách hàng</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Loại HM</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Đã dùng</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Hạn mức</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">%</th>
                  </tr>
                </thead>
                <tbody>
                  {customerRows.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-xs">{c.quota.type}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{c.quota.used.toLocaleString()} kg</td>
                      <td className="px-4 py-3 whitespace-nowrap">{c.quota.limit.toLocaleString()} kg</td>
                      <td className={`px-4 py-3 font-semibold ${c.ratio >= 1 ? "text-destructive" : c.ratio >= 0.85 ? "text-warning" : ""}`}>
                        {Math.round(c.ratio * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
