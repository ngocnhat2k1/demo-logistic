"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/stores/auth";
import { useDataStore } from "@/shared/stores/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Briefcase, Building2, ShieldCheck, Truck, UserCog, Users2 } from "lucide-react";
import type { User, UserRole } from "@/shared/types";

const ROLE_META: Record<UserRole, { label: string; icon: React.ElementType; subtitle: string; color: string }> = {
  ADMIN: { label: "Quản trị (Admin)", icon: ShieldCheck, subtitle: "Toàn quyền hệ thống", color: "bg-red-50 text-red-600" },
  OPS_MANAGER: { label: "Quản lý vận hành", icon: UserCog, subtitle: "Giám sát điều phối + báo cáo", color: "bg-purple-50 text-purple-600" },
  DISPATCHER: { label: "Điều độ viên", icon: Briefcase, subtitle: "Phân xe, theo dõi đơn", color: "bg-blue-50 text-blue-600" },
  SALES: { label: "Kinh doanh", icon: Users2, subtitle: "Tạo đơn cho khách", color: "bg-amber-50 text-amber-600" },
  CUSTOMER: { label: "Khách hàng", icon: Building2, subtitle: "Theo dõi đơn và hạn mức", color: "bg-cyan-50 text-cyan-700" },
  DRIVER: { label: "Tài xế", icon: Truck, subtitle: "App di động (giả lập)", color: "bg-emerald-50 text-emerald-600" },
};

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const users = useDataStore((s) => s.users);

  useEffect(() => {
    // Pre-warm: ensure data is loaded
  }, []);

  function login(role: UserRole) {
    const u: User | undefined = users.find((x) => x.role === role);
    if (!u) return;
    setUser(u);
    if (role === "DRIVER") router.replace("/driver");
    else if (role === "CUSTOMER") router.replace("/customer");
    else router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="Tratimex" width={190} height={35} className="h-auto w-48" />
          </div>
          <CardTitle className="text-2xl">Tratimex</CardTitle>
          <CardDescription>Đăng nhập 1-click với role có sẵn</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(ROLE_META) as UserRole[]).map((r) => {
              const meta = ROLE_META[r];
              const Icon = meta.icon;
              return (
                <button
                  key={r}
                  onClick={() => login(r)}
                  className="group flex items-center gap-4 rounded-lg border bg-card p-4 text-left transition hover:border-primary hover:shadow-md"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${meta.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{meta.label}</p>
                    <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Bản demo Tratimex — không có xác thực thật. Chọn role để vào hệ thống.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
