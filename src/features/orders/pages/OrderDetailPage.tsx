"use client";

import { Topbar } from "@/shared/components/Topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useDataStore } from "@/shared/stores/data";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Package, User as UserIcon, X, Scissors } from "lucide-react";
import { StatusBadge } from "@/features/orders/components/StatusBadge";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatKg } from "@/shared/utils";
import Link from "next/link";
import { canCancel } from "@/features/orders/domain/orderStatus";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/stores/auth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Input, Label } from "@/shared/ui/input";

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const order = useDataStore((s) => s.orders.find((o) => o.id === id));
  const customers = useDataStore((s) => s.customers);
  const vehicles = useDataStore((s) => s.vehicles);
  const drivers = useDataStore((s) => s.drivers);
  const cancelOrder = useDataStore((s) => s.cancelOrder);
  const splitOrder = useDataStore((s) => s.splitOrder);
  const user = useAuthStore((s) => s.currentUser);

  const [splitOpen, setSplitOpen] = useState(false);
  const [splitParts, setSplitParts] = useState<number[]>([0, 0]);

  if (!order) {
    return (
      <>
        <Topbar title="Chi tiết đơn" />
        <div className="p-6">
          <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /> Quay lại</Button>
          <p className="mt-4 text-muted-foreground">Không tìm thấy đơn</p>
        </div>
      </>
    );
  }

  const customer = customers.find((c) => c.id === order.customerId);

  function doCancel() {
    if (!user || !order) return;
    if (!confirm(`Huỷ đơn ${order.code}?`)) return;
    cancelOrder(order.id, user.id);
    toast.success(`Đã huỷ đơn ${order.code}`);
  }

  function doSplit() {
    if (!order) return;
    const total = splitParts.reduce((s, x) => s + x, 0);
    if (Math.abs(total - order.weightKg) > 0.5) {
      toast.error(`Tổng KL các phần (${total}kg) phải bằng KL đơn (${order.weightKg}kg)`);
      return;
    }
    if (splitParts.some((p) => p <= 0)) {
      toast.error("Mỗi phần phải > 0kg");
      return;
    }
    const ids = splitOrder(order.id, splitParts);
    toast.success(`Đã tách thành ${ids.length} đơn con`);
    setSplitOpen(false);
    router.push("/dispatch");
  }

  return (
    <>
      <Topbar title={`Đơn ${order.code}`} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
          <div className="flex gap-2">
            {canCancel(order.status) && order.assignments.length === 0 && (
              <Button variant="outline" size="sm" onClick={() => setSplitOpen(true)}>
                <Scissors className="h-4 w-4" /> Tách đơn
              </Button>
            )}
            {canCancel(order.status) && (
              <Button variant="destructive" size="sm" onClick={doCancel}>
                <X className="h-4 w-4" /> Huỷ đơn
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="font-mono">{order.code}</CardTitle>
                <CardDescription>{order.description}</CardDescription>
              </div>
              <StatusBadge status={order.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Field icon={<UserIcon className="h-4 w-4" />} label="Khách hàng">
                {customer ? (
                  <Link href={`/customers/${customer.id}`} className="text-primary hover:underline">{customer.name}</Link>
                ) : "—"}
              </Field>
              <Field icon={<Package className="h-4 w-4" />} label="Khối lượng">{formatKg(order.weightKg)}</Field>
              <Field icon={<MapPin className="h-4 w-4" />} label="Điểm lấy">{order.pickup.address}</Field>
              <Field icon={<MapPin className="h-4 w-4" />} label="Điểm giao">{order.dropoff.address}</Field>
              <Field label="Yêu cầu giao">{format(new Date(order.requestedDeliveryAt), "dd/MM/yyyy HH:mm", { locale: vi })}</Field>
              <Field label="Tạo lúc">{format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}</Field>
              {order.notes && <Field label="Ghi chú" full>{order.notes}</Field>}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="assignments">
          <TabsList>
            <TabsTrigger value="assignments">Phân xe ({order.assignments.length})</TabsTrigger>
            <TabsTrigger value="timeline">Lịch sử</TabsTrigger>
            <TabsTrigger value="documents">Chứng từ</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <Card>
              <CardContent className="p-4 space-y-2">
                {order.assignments.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Chưa phân xe.{" "}
                    <Link href="/dispatch" className="text-primary hover:underline">Đi đến điều phối →</Link>
                  </p>
                )}
                {order.assignments.map((a) => {
                  const v = vehicles.find((x) => x.id === a.vehicleId);
                  const d = drivers.find((x) => x.id === a.driverId);
                  return (
                    <div key={a.id} className="rounded-md border p-3 text-sm">
                      <p>
                        <span className="font-mono font-medium">{v?.plateNumber}</span> — Tài xế{" "}
                        <span className="font-medium">{d?.fullName}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.partLabel ? `${a.partLabel} • ` : ""}
                        {formatKg(a.weightKg)} • Phân lúc{" "}
                        {format(new Date(a.assignedAt), "dd/MM HH:mm", { locale: vi })}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardContent className="p-4">
                <ol className="relative border-l-2 border-muted ml-3 space-y-4">
                  {order.events.map((e) => (
                    <li key={e.id} className="ml-4">
                      <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-primary" />
                      <p className="text-sm font-medium">{e.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(e.at), "dd/MM/yyyy HH:mm:ss", { locale: vi })} • {e.actorId}
                      </p>
                      {Object.keys(e.payload).length > 0 && (
                        <pre className="mt-1 rounded bg-muted px-2 py-1 text-xs overflow-x-auto">
                          {JSON.stringify(e.payload, null, 0)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardContent className="p-4">
                {(order.deliveryEvidence?.length ?? 0) === 0 && !order.signature && (
                  <p className="text-sm text-muted-foreground">Chưa có chứng từ giao hàng (POD)</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {order.deliveryEvidence?.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="evidence" className="rounded border w-full aspect-square object-cover" />
                  ))}
                  {order.signature && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={order.signature} alt="signature" className="rounded border bg-white col-span-2 aspect-video object-contain" />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={splitOpen} onOpenChange={setSplitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tách đơn {order.code} ({formatKg(order.weightKg)})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tổng phần: {splitParts.reduce((s, x) => s + x, 0).toLocaleString()} kg</span>
              <span>Mục tiêu: {order.weightKg.toLocaleString()} kg</span>
            </div>
            {splitParts.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Label className="w-20">Phần {i + 1}</Label>
                <Input
                  type="number"
                  value={p}
                  onChange={(e) => {
                    const next = [...splitParts];
                    next[i] = Number(e.target.value);
                    setSplitParts(next);
                  }}
                />
                {splitParts.length > 2 && (
                  <Button variant="ghost" size="icon" onClick={() => setSplitParts(splitParts.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setSplitParts([...splitParts, 0])}>
              + Thêm phần
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitOpen(false)}>Huỷ</Button>
            <Button onClick={doSplit}>Tách đơn</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children, icon, full }: { label: string; children: React.ReactNode; icon?: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  );
}
