"use client";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useDataStore } from "@/shared/stores/data";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw, Wallet, Plus, Pencil } from "lucide-react";
import { AddCustomerDialog } from "@/features/customers/components/AddCustomerDialog";
import { PaymentDialog } from "@/features/quota/components/PaymentDialog";
import { TopUpDialog } from "@/features/quota/components/TopUpDialog";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import { Badge } from "@/shared/ui/badge";
import { quotaLabel, quotaLevelColor, quotaInUse, quotaUsageRatio } from "@/features/orders/domain/quota";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatKg } from "@/shared/utils";
import { toast } from "sonner";
import { StatusBadge } from "@/features/orders/components/StatusBadge";
import { useState } from "react";
import Link from "next/link";

export default function CustomerDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const customer = useDataStore((s) => s.customers.find((c) => c.id === id));
  const orders = useDataStore((s) => s.orders).filter((o) => o.customerId === id);
  const resetMonthlyQuota = useDataStore((s) => s.resetMonthlyQuota);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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

  const lvl = quotaLevelColor(customer.quota);
  const isPostpaid = customer.quota.type === "POSTPAID";
  const ratio = quotaUsageRatio(customer.quota);
  const inUse = quotaInUse(customer.quota);

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
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" /> Sửa
                </Button>
                <Badge variant="outline">{customer.source}</Badge>
              </div>
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
                      {isPostpaid
                        ? `Đã giao tích lũy ${formatKg(customer.quota.used)} — Công nợ ${formatKg(customer.quota.outstanding ?? 0)}`
                        : `${formatKg(inUse)} / ${formatKg(customer.quota.limit)} đã sử dụng (gồm ${formatKg(customer.quota.reserved ?? 0)} giữ chỗ)`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {isPostpaid && (customer.quota.outstanding ?? 0) > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setPaymentOpen(true)}>
                        <Wallet className="h-4 w-4" /> Ghi nhận thanh toán
                      </Button>
                    )}
                    {customer.quota.type === "PREPAID" && (
                      <Button variant="outline" size="sm" onClick={() => setTopupOpen(true)}>
                        <Plus className="h-4 w-4" /> Nạp thêm
                      </Button>
                    )}
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
                </div>
              </CardHeader>
              <CardContent>
                {isPostpaid ? (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Field label="Đã giao tích lũy" value={formatKg(customer.quota.used)} />
                      <Field label="Đang giữ chỗ" value={formatKg(customer.quota.reserved ?? 0)} />
                      <Field label="Công nợ chưa thu" value={formatKg(customer.quota.outstanding ?? 0)} />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Hình thức thanh toán sau — không giới hạn khối lượng. Mỗi đơn DELIVERED sẽ tăng công nợ;
                      ghi nhận thanh toán để giảm công nợ.
                    </p>
                  </div>
                ) : (
                  <>
                    <Progress
                      value={Math.min(100, ratio * 100)}
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
                      {Math.round(ratio * 100)}% sử dụng
                      {lvl === "warn" && " — Cảnh báo: gần đầy"}
                      {lvl === "danger" && " — Đã đầy hoặc vượt hạn mức"}
                    </p>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <Field label="Hạn mức" value={formatKg(customer.quota.limit)} />
                      <Field label="Đã giữ chỗ (đơn in-flight)" value={formatKg(customer.quota.reserved ?? 0)} />
                      <Field label="Đã tiêu thụ (đã giao)" value={formatKg(customer.quota.used)} />
                    </div>
                    {customer.quota.type === "MONTHLY" && customer.quota.lastResetAt && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Reset gần nhất: {format(new Date(customer.quota.lastResetAt), "dd/MM/yyyy", { locale: vi })}
                      </p>
                    )}
                  </>
                )}
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
                          <Badge variant={txVariant(tx.type)}>{tx.type}</Badge>
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

      <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} customer={customer} />
      <TopUpDialog open={topupOpen} onOpenChange={setTopupOpen} customer={customer} />
      <AddCustomerDialog open={editOpen} onOpenChange={setEditOpen} initial={customer} />
    </>
  );
}

function txVariant(type: string): "success" | "warning" | "outline" | "default" | "secondary" {
  if (type === "REFUND" || type === "RELEASE" || type === "PAYMENT") return "success";
  if (type === "RESET") return "warning";
  if (type === "RESERVE") return "default";
  return "outline";
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
