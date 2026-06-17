"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { MapCanvas } from "@/shared/map";
import { formatKg } from "@/shared/utils";
import type { MapMarker, MapPolyline } from "@/shared/map/MapCanvas";
import type { RouteCluster } from "../../domain/consolidate";

export function RouteClusterDrawer({ cluster, onClose }: { cluster: RouteCluster | null; onClose: () => void }) {
  const open = !!cluster;
  const markers: MapMarker[] = cluster
    ? cluster.stops.map((s, i) => {
        const o = cluster.orders.find((x) => x.id === s.orderId)!;
        return { id: s.orderId, lat: o.dropoff.lat, lng: o.dropoff.lng, kind: "dropoff", label: String(i + 1), popup: `${i + 1}. ${o.code}` };
      })
    : [];
  const polylines: MapPolyline[] = cluster
    ? [
        {
          id: "route",
          points: cluster.stops.map((s) => {
            const o = cluster.orders.find((x) => x.id === s.orderId)!;
            return { lat: o.dropoff.lat, lng: o.dropoff.lng };
          }),
          dashed: true,
          color: "#2563eb",
        },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cụm tuyến gom đơn</DialogTitle>
        </DialogHeader>
        {cluster && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border">
              <MapCanvas markers={markers} polylines={polylines} className="h-56 w-full" fitKey={cluster.id} />
            </div>
            <p className="text-xs text-muted-foreground">
              {cluster.orders.length} đơn • {formatKg(cluster.totalKg)} • tiết kiệm ~{Math.round(cluster.savedKm)} km
              {cluster.vehicle ? ` • xe đề xuất ${cluster.vehicle.plateNumber}` : " • chưa có xe đủ tải"}
            </p>
            <ol className="space-y-1">
              {cluster.stops.map((s, i) => (
                <li key={s.orderId} className="flex items-center gap-2 rounded-md border p-2 text-xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="font-mono font-semibold">{s.orderCode}</span>
                  <span className="truncate text-muted-foreground">{s.address}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
