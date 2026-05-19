"use client";

import { Card, CardContent } from "@/shared/ui/card";
import { Gauge, PackageCheck, Clock, AlertCircle } from "lucide-react";
import { formatKg } from "@/shared/utils";
import type { QuotaKpis } from "@/features/quota/hooks/useQuotaAggregates";

interface QuotaKpiCardsProps {
  kpis: QuotaKpis;
}

export function QuotaKpiCards({ kpis }: QuotaKpiCardsProps) {
  const items = [
    {
      label: "Tổng hạn mức (PREPAID+MONTHLY)",
      value: formatKg(kpis.totalLimit),
      icon: Gauge,
      tone: "text-primary",
    },
    {
      label: "Đã tiêu thụ",
      value: formatKg(kpis.totalUsed),
      icon: PackageCheck,
      tone: "text-success",
    },
    {
      label: "Đang giữ chỗ",
      value: formatKg(kpis.totalReserved),
      icon: Clock,
      tone: "text-warning",
    },
    {
      label: "Công nợ POSTPAID",
      value: formatKg(kpis.totalOutstanding),
      icon: AlertCircle,
      tone: "text-destructive",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground line-clamp-1">{it.label}</p>
              <p className="text-xl font-semibold mt-1 truncate">{it.value}</p>
            </div>
            <it.icon className={`h-8 w-8 shrink-0 ${it.tone}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
