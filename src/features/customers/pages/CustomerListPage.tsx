"use client";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent } from "@/shared/ui/card";
import { useDataStore } from "@/shared/stores/data";
import { Progress } from "@/shared/ui/progress";
import { Badge } from "@/shared/ui/badge";
import { quotaLevelColor, quotaLabel } from "@/features/orders/domain/quota";
import { Input } from "@/shared/ui/input";
import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { formatKg } from "@/shared/utils";

export default function CustomerListPage() {
  const customers = useDataStore((s) => s.customers);
  const [q, setQ] = useState("");
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.code.toLowerCase().includes(q.toLowerCase()) ||
      c.phone.includes(q)
  );

  return (
    <>
      <Topbar title="Khách hàng" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, mã, SĐT..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-sm text-muted-foreground">{filtered.length} khách hàng</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Mã</th>
                    <th className="px-4 py-3 font-medium">Tên KH</th>
                    <th className="px-4 py-3 font-medium">SĐT</th>
                    <th className="px-4 py-3 font-medium">Loại hạn mức</th>
                    <th className="px-4 py-3 font-medium">Sử dụng</th>
                    <th className="px-4 py-3 font-medium">Nguồn</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const r = c.quota.limit ? c.quota.used / c.quota.limit : 0;
                    const lvl = quotaLevelColor(c.quota);
                    return (
                      <tr key={c.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs">
                          <Link href={`/customers/${c.id}`} className="hover:underline text-primary">
                            {c.code}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/customers/${c.id}`} className="hover:underline">
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{c.phone}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{quotaLabel(c.quota)}</Badge>
                        </td>
                        <td className="px-4 py-3 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={Math.min(100, r * 100)}
                              indicatorClassName={
                                lvl === "danger"
                                  ? "bg-destructive"
                                  : lvl === "warn"
                                    ? "bg-warning"
                                    : "bg-primary"
                              }
                              className="w-24"
                            />
                            <span className={
                              lvl === "danger"
                                ? "text-destructive font-semibold text-xs"
                                : lvl === "warn"
                                  ? "text-warning font-semibold text-xs"
                                  : "text-xs text-muted-foreground"
                            }>
                              {Math.round(r * 100)}% — {formatKg(c.quota.used)}/{formatKg(c.quota.limit)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{c.source}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
