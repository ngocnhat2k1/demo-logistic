"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import type {
  TopUsageItem,
  TypeDistributionItem,
} from "@/features/quota/hooks/useQuotaAggregates";

interface QuotaChartsProps {
  typeDistribution: TypeDistributionItem[];
  topUsage: TopUsageItem[];
}

const PIE_COLORS: Record<string, string> = {
  POSTPAID: "#f97316",
  MONTHLY: "#2563eb",
  PREPAID: "#16a34a",
};

export function QuotaCharts({ typeDistribution, topUsage }: QuotaChartsProps) {
  const pieData = typeDistribution.filter((d) => d.count > 0);
  const barData = topUsage.map((u) => ({
    name: u.name.length > 14 ? `${u.name.slice(0, 12)}…` : u.name,
    fullName: u.name,
    ratio: Math.round(u.ratio * 100),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Phân bố theo loại hạn mức</CardTitle>
          <CardDescription>Số khách hàng theo mỗi loại</CardDescription>
        </CardHeader>
        <CardContent className="h-[220px] px-2 md:px-6">
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius="75%"
                  label={{ fontSize: 11 }}
                >
                  {pieData.map((d) => (
                    <Cell key={d.type} fill={PIE_COLORS[d.type]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top 10 KH theo % sử dụng</CardTitle>
          <CardDescription>Chỉ tính khách PREPAID/MONTHLY</CardDescription>
        </CardHeader>
        <CardContent className="h-[220px] px-2 md:px-6">
          {barData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Chưa có khách hàng có hạn mức
            </p>
          ) : (
            <ResponsiveContainer>
              <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v) => [`${v}%`, "Sử dụng"]}
                  labelFormatter={(_label, payload) => {
                    const row = payload?.[0]?.payload as { fullName?: string } | undefined;
                    return row?.fullName ?? "";
                  }}
                />
                <Bar dataKey="ratio" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
