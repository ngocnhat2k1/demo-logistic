"use client";

import { useState, useRef } from "react";
import { Button } from "@/shared/ui/button";
import { useDataStore } from "@/shared/stores/data";
import { useAuthStore } from "@/features/auth/stores/auth";
import { AlertTriangle, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const MAX_PHOTOS = 4;
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // ~2 MB

export default function DriverSOSPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.currentUser);
  const orders = useDataStore((s) => s.orders);
  const vehicles = useDataStore((s) => s.vehicles);
  const raiseSos = useDataStore((s) => s.raiseSos);
  const pushNotification = useDataStore((s) => s.pushNotification);

  const [message, setMessage] = useState("Khẩn cấp - tài xế bấm SOS");
  const [photos, setPhotos] = useState<string[]>([]);
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Tối đa ${MAX_PHOTOS} ảnh`);
      return;
    }
    const accepted = files.slice(0, remaining);
    const data = await Promise.all(
      accepted.map(
        (f) =>
          new Promise<string | null>((resolve) => {
            if (f.size > MAX_PHOTO_SIZE) {
              toast.error(`Ảnh "${f.name}" vượt 2MB`);
              resolve(null);
              return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(f);
          })
      )
    );
    setPhotos((prev) => [...prev, ...data.filter((x): x is string => Boolean(x))]);
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

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
    if (!user?.vehicleId) return;
    const v = vehicles.find((x) => x.id === user.vehicleId);
    if (!v) return;
    const myOrders = orders
      .filter(
        (o) => o.assignments.some((a) => a.vehicleId === v.id) && o.status === "IN_TRANSIT"
      )
      .map((o) => o.id);
    const text = message.trim() || "Khẩn cấp - tài xế bấm SOS";
    raiseSos(v.id, v.currentLocation, myOrders, text, photos.length ? photos : undefined);
    pushNotification({
      type: "EMERGENCY_SOS",
      severity: "destructive",
      title: "🚨 SOS từ tài xế",
      message: `${v.driverName} - xe ${v.plateNumber} - cần hỗ trợ khẩn cấp`,
      targetRoles: ["DISPATCHER", "OPS_MANAGER", "ADMIN"],
    });
    toast.error("Đã gửi cảnh báo SOS đến điều độ!");
    setHolding(false);
    setProgress(0);
    setTimeout(() => router.push("/driver"), 800);
  }

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-left text-sm text-amber-800">
        <AlertTriangle className="h-5 w-5 inline mr-1" />
        Chỉ sử dụng SOS trong tình huống khẩn cấp: xe hỏng, tai nạn, đe dọa.
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Mô tả tình huống</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Mô tả ngắn gọn để điều độ nắm tình hình..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Hình ảnh đính kèm ({photos.length}/{MAX_PHOTOS})
        </label>
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-md overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt={`SOS ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-0.5"
                  aria-label="Xoá ảnh"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < MAX_PHOTOS && (
          <label className="flex items-center justify-center gap-2 cursor-pointer rounded-md border border-dashed py-3 text-sm text-muted-foreground hover:bg-muted/30">
            <ImageIcon className="h-4 w-4" />
            Chọn ảnh từ máy hoặc chụp ảnh
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={onFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      <div className="flex justify-center pt-4">
        <button
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          className="relative h-40 w-40 rounded-full bg-destructive text-destructive-foreground shadow-2xl active:scale-95 transition-transform"
        >
          {holding && (
            <span
              className="absolute inset-0 rounded-full border-8 border-yellow-300"
              style={{
                clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((progress / 100) * 2 * Math.PI)}% ${50 - 50 * Math.cos((progress / 100) * 2 * Math.PI)}%, 50% 50%)`,
              }}
            />
          )}
          <div className="flex flex-col items-center gap-1">
            <AlertTriangle className="h-12 w-12" />
            <span className="text-xl font-bold">SOS</span>
            <span className="text-[10px]">Giữ 2 giây để gửi</span>
          </div>
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {holding ? "Đang chuẩn bị gửi cảnh báo..." : "Nhấn và giữ nút trên 2 giây để gửi SOS"}
      </p>

      <Button variant="outline" className="w-full" onClick={() => router.push("/driver")}>
        Quay lại
      </Button>
    </div>
  );
}
