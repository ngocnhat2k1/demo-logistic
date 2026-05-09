"use client";

import { Sidebar } from "@/components/shared/Sidebar";
import { useAuthStore } from "@/lib/stores/auth";
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
  }, [ready, user, router]);

  if (!user || user.role === "DRIVER") return null;

  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
