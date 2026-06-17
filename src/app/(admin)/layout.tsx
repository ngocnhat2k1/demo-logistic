"use client";

import { Sidebar } from "@/shared/components/Sidebar";
import { WarehouseGate } from "@/features/warehouses/components/WarehouseGate";
import { CopilotProvider } from "@/features/copilot/components/CopilotProvider";
import { useAuthStore } from "@/features/auth/stores/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.currentUser);
  const ready = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.role === "DRIVER") router.replace("/driver");
    else if (user.role === "CUSTOMER") router.replace("/customer");
  }, [ready, user, router]);

  if (!user || user.role === "DRIVER" || user.role === "CUSTOMER") return null;

  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <WarehouseGate>{children}</WarehouseGate>
      </div>
      <CopilotProvider />
    </div>
  );
}
