"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Clock, MapPin, Package, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { cn, formatKg } from "@/shared/utils";
import { SupervisorReviewDialog } from "@/features/dispatch/components/SupervisorReviewDialog";
import type { Order } from "@/shared/types";

type Tab = "pending" | "history";

export function ApprovalsQueue() {
  const router = useRouter();
  const user = useAuthStore((s) => s.currentUser);
  const orders = useDataStore((s) => s.orders);
  const carriers = useDataStore((s) => s.carriers);
  const customers = useDataStore((s) => s.customers);
  const users = useDataStore((s) => s.users);

  const [tab, setTab] = useState<Tab>("pending");
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);

  const canReview = user?.role === "ADMIN" || user?.role === "OPS_MANAGER";

  useEffect(() => {
    if (user && !canReview) {
      router.replace("/dashboard");
    }
  }, [user, canReview, router]);

  const pendingOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === "PENDING_SUPERVISOR_REVIEW")
        .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1)),
    [orders],
  );

  const historyOrders = useMemo(
    () =>
      orders
        .filter((o) =>
          o.events.some(
            (e) =>
              e.type === "SUPERVISOR_REVIEW_APPROVED" || e.type === "SUPERVISOR_REVIEW_REJECTED",
          ),
        )
        .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1)),
    [orders],
  );

  if (user && !canReview) return null;

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";
  const carrierName = (id?: string) => (id ? carriers.find((c) => c.id === id)?.name : null) ?? "—";
  const userName = (id?: string) => (id ? users.find((u) => u.id === id)?.fullName : null) ?? "—";

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-warning" />
            <CardTitle className="text-base">Duyệt nhà xe dự phòng</CardTitle>
            <Badge variant="warning" className="text-[10px]">
              {pendingOrders.length} đang chờ
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Giám sát khu vực (Quản lý vận hành) xem xét các đơn dispatcher muốn dùng nhà xe dự phòng. Duyệt
            xong sẽ chọn xe luôn; nếu từ chối, đơn quay về danh sách chờ phân.
          </p>
          <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 max-w-sm">
            <TabButton active={tab === "pending"} onClick={() => setTab("pending")}>
              <ShieldAlert className="h-3.5 w-3.5" />
              Đang chờ
              <Badge variant={tab === "pending" ? "warning" : "outline"} className="text-[10px] h-4 px-1">
                {pendingOrders.length}
              </Badge>
            </TabButton>
            <TabButton active={tab === "history"} onClick={() => setTab("history")}>
              <Clock className="h-3.5 w-3.5" />
              Lịch sử
              <Badge variant={tab === "history" ? "secondary" : "outline"} className="text-[10px] h-4 px-1">
                {historyOrders.length}
              </Badge>
            </TabButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {tab === "pending" && (
            <>
              {pendingOrders.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-10">
                  Không có đơn nào đang chờ duyệt.
                </p>
              )}
              {pendingOrders.map((o) => (
                <PendingRow
                  key={o.id}
                  order={o}
                  customerName={customerName(o.customerId)}
                  carrierName={carrierName(o.carrierId)}
                  requesterName={userName(o.supervisorReview?.requestedBy)}
                  onReview={() => setReviewOrder(o)}
                />
              ))}
            </>
          )}
          {tab === "history" && (
            <>
              {historyOrders.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-10">
                  Chưa có đơn nào được duyệt hoặc từ chối.
                </p>
              )}
              {historyOrders.map((o) => (
                <HistoryRow
                  key={o.id}
                  order={o}
                  customerName={customerName(o.customerId)}
                  carrierName={carrierName(o.carrierId)}
                  reviewerName={userName(o.supervisorReview?.reviewedBy)}
                />
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <SupervisorReviewDialog order={reviewOrder} onClose={() => setReviewOrder(null)} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs transition",
        active
          ? "bg-background shadow-sm font-semibold"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function PendingRow({
  order,
  customerName,
  carrierName,
  requesterName,
  onReview,
}: {
  order: Order;
  customerName: string;
  carrierName: string;
  requesterName: string;
  onReview: () => void;
}) {
  const requestedAt = order.supervisorReview?.requestedAt
    ? new Date(order.supervisorReview.requestedAt).toLocaleString("vi-VN")
    : "—";
  return (
    <div className="rounded-md border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/orders/${order.id}`}
              className="font-mono font-semibold text-primary hover:underline"
            >
              {order.code}
            </Link>
            <Badge variant="warning" className="text-[10px]">Chờ giám sát duyệt</Badge>
          </div>
          <p className="text-sm font-medium truncate">{customerName}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            <MapPin className="inline h-3 w-3" /> {order.dropoff.address}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" /> NCC dự phòng: <b className="text-foreground">{carrierName}</b>
            </span>
            <span className="inline-flex items-center gap-1">
              <Package className="h-3 w-3" /> {formatKg(order.weightKg)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {requestedAt}
            </span>
            <span>Yêu cầu bởi {requesterName}</span>
          </div>
        </div>
        <Button onClick={onReview} className="shrink-0">
          <ShieldCheck className="h-4 w-4 mr-1" /> Mở duyệt
        </Button>
      </div>
    </div>
  );
}

function HistoryRow({
  order,
  customerName,
  carrierName,
  reviewerName,
}: {
  order: Order;
  customerName: string;
  carrierName: string;
  reviewerName: string;
}) {
  const decision = order.supervisorReview?.decision;
  const reviewedAt = order.supervisorReview?.reviewedAt
    ? new Date(order.supervisorReview.reviewedAt).toLocaleString("vi-VN")
    : "—";
  const approved = decision === "APPROVED";
  return (
    <div className="rounded-md border bg-card p-3 text-xs space-y-1.5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/orders/${order.id}`}
              className="font-mono font-semibold text-primary hover:underline text-sm"
            >
              {order.code}
            </Link>
            {approved ? (
              <Badge variant="success" className="text-[10px] inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Đã duyệt
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px] inline-flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Từ chối
              </Badge>
            )}
          </div>
          <p className="font-medium truncate">{customerName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" /> NCC: {carrierName}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {reviewedAt}
            </span>
            <span>Bởi {reviewerName}</span>
          </div>
          {!approved && order.supervisorReview?.rejectReason && (
            <p className="mt-1 text-[11px] text-destructive">
              Lý do: {order.supervisorReview.rejectReason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
