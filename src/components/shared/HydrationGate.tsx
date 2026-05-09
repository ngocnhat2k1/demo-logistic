"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth";
import { useDataStore } from "@/lib/stores/data";

export function HydrationGate({ children }: { children: React.ReactNode }) {
  const authReady = useAuthStore((s) => s._hasHydrated);
  const dataReady = useDataStore((s) => s._hasHydrated);
  const ensureSeeded = useDataStore((s) => s.ensureSeeded);

  useEffect(() => {
    if (dataReady) ensureSeeded();
  }, [dataReady, ensureSeeded]);

  if (!authReady || !dataReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Đang tải dữ liệu demo...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
