"use client";

import { Topbar } from "@/components/shared/Topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataStore } from "@/lib/stores/data";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { quotaLabel, quotaLevelColor } from "@/lib/domain/quota";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatKg } from "@/lib/utils";
import { toast } from "sonner";
import { StatusBadge } from "@/components/orders/StatusBadge";
import Link from "next/link";

export default function CustomerDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const customer = useDataStore((s) => s.customers.find((c) => c.id === id));
  const orders = useDataStore((s) => s.orders.filter((o) => o.customerId === id));
  const resetMonthlyQuota = useDataStore((s) => s.resetMonthlyQuota);

  if (!customer) {
    return (
      <>
        <Topbar title="Chi tiết khách hàng" />
        <div className="p-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
          <p className="mt-4 text-muted-foreground">Không tìm thấy khách hàng.</p>
        </div>
      </>
    );
  }

  const r = customer.quota.limit ? customer.quota.used / customer.quota.limit : 0;
  const lvl = quotaLevelColor(customer.quota);

  return (
    <>
      <Topbar title={`KH: ${customer.name}`} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{customer.name}</CardTitle>
                <CardDescription>{customer.code} • {customer.phone}</CardDescription>
              </div>
              <Badge variant="outline">{customer.source}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Field label="MST" value={customer.taxCode} />
              <Field label="Email" value={customer.email} />
              <Field label="Địa chỉ" value={customer.address} />
              <Field label="Tạo lúc" value={format(new Date(customer.createdAt), "dd/MM/yyyy", { locale: vi })} />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="quota">
          <TabsList>
            <TabsTrigger value="quota">Hạn mức</TabsTrigger>
            <TabsTrigger value="orders">Đơn hàng ({orders.length})</TabsTrigger>
            <TabsTrigger value="history">Lịch sử biến động</TabsTrigger>
          </TabsList>

          <TabsContent value="quota">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Hạn mức {quotaLabel(customer.quota)}</CardTitle>
                    <CardDescription>
                      {formatKg(customer.quota.used)} / {formatKg(customer.quota.limit)} đã sử dụng
                    </CardDescription>
                  </div>
                  {customer.quota.type === "MONTHLY" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetMonthlyQuota(customer.id);
                        toast.success("Đã reset hạn mức tháng");
                      }}
                    >
                      <RotateCcw className="h-4 w-4" /> Skip to next month
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Progress
                  value={Math.min(100, r * 100)}
                  indicatorClassName={
                    lvl === "danger" ? "bg-destructive" : lvl === "warn" ? "bg-warning" : "bg-primary"
                  }
                  className="h-3"
                />
                <p className={`mt-2 text-sm ${
                  lvl === "danger" ? "text-destructive font-semibold" :
                  lvl === "warn" ? "text-warning font-semibold" :
                  "text-muted-foreground"
                }`}>
                  {Math.round(r * 100)}% sử dụng
                  {lvl === "warn" && " — Cảnh báo: gần đầy"}
                  {lvl === "danger" && " — Đã đầy hoặc vượt hạn mức"}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Mã đơn</th>
                      <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                      <th className="px-4 py-3 text-left font-medium">Khối lượng</th>
                      <th className="px-4 py-3 text-left font-medium">Tạo lúc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Chưa có đơn nào</td></tr>
                    )}
                    {orders.slice(0, 30).map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="px-4 py-3">
                          <Link href={`/orders/${o.id}`} className="text-primary hover:underline font-mono">
                            {o.code}
                          </Link>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                        <td className="px-4 py-3">{formatKg(o.weightKg)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(o.createdAt), "dd/MM HH:mm", { locale: vi })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Loại</th>
                      <th className="px-4 py-3 text-left font-medium">Khối lượng</th>
                      <th className="px-4 py-3 text-left font-medium">Lý do</th>
                      <th className="px-4 py-3 text-left font-medium">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...customer.quota.history].reverse().map((tx) => (
                      <tr key={tx.id} className="border-t">
                        <td className="px-4 py-3">
                          <Badge variant={tx.type === "REFUND" ? "success" : tx.type === "RESET" ? "warning" : "outline"}>
                            {tx.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{formatKg(tx.amount)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{tx.reason}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                        </td>
                      </tr>
                    ))}
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

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
