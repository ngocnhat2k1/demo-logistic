"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/lib/stores/data";
import { useAuthStore } from "@/lib/stores/auth";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function SosPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.currentUser);
  const orders = useDataStore((s) => s.orders);
  const vehicles = useDataStore((s) => s.vehicles);
  const raiseSos = useDataStore((s) => s.raiseSos);
  const pushNotification = useDataStore((s) => s.pushNotification);

  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startHold() {
    setHolding(true);
    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const np = p + 5;
        if (np >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          fire();
        }
        return np;
      });
    }, 100);
  }

  function endHold() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setHolding(false);
    setProgress(0);
  }

  function fire() {
    if (!user?.driverId) return;
    const v = vehicles.find((x) => x.currentDriverId === user.driverId);
    if (!v) return;
    const myOrders = orders
      .filter((o) => o.assignments.some((a) => a.driverId === user.driverId) && o.status === "IN_TRANSIT")
      .map((o) => o.id);
    raiseSos(user.driverId, v.id, v.currentLocation, myOrders, "Khẩn cấp - tài xế bấm SOS");
    pushNotification({
      type: "EMERGENCY_SOS",
      severity: "destructive",
      title: "🚨 SOS từ tài xế",
      message: `${user.fullName} - xe ${v.plateNumber} - cần hỗ trợ khẩn cấp`,
      targetRoles: ["DISPATCHER", "OPS_MANAGER", "ADMIN"],
    });
    toast.error("Đã gửi cảnh báo SOS đến điều độ!");
    setHolding(false);
    setProgress(0);
    setTimeout(() => router.push("/driver"), 800);
  }

  return (
    <div className="p-6 space-y-6 text-center">
      <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-left text-sm text-amber-800">
        <AlertTriangle className="h-5 w-5 inline mr-1" />
        Chỉ sử dụng SOS trong tình huống khẩn cấp: xe hỏng, tai nạn, đe dọa.
      </div>

      <div className="flex justify-center pt-12">
        <button
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          className="relative h-48 w-48 rounded-full bg-destructive text-destructive-foreground shadow-2xl active:scale-95 transition-transform"
        >
          {holding && (
            <span
              className="absolute inset-0 rounded-full border-8 border-yellow-300"
              style={{ clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((progress / 100) * 2 * Math.PI)}% ${50 - 50 * Math.cos((progress / 100) * 2 * Math.PI)}%, 50% 50%)` }}
            />
          )}
          <div className="flex flex-col items-center gap-2">
            <AlertTriangle className="h-16 w-16" />
            <span className="text-2xl font-bold">SOS</span>
            <span className="text-xs">Giữ 2 giây</span>
          </div>
        </button>
      </div>

      <p className="text-sm text-muted-foreground pt-4">
        {holding ? "Đang chuẩn bị gửi cảnh báo..." : "Nhấn và giữ 2 giây để gửi cảnh báo khẩn cấp"}
      </p>

      <Button variant="outline" className="w-full" onClick={() => router.push("/driver")}>
        Quay lại
      </Button>
    </div>
  );
}
