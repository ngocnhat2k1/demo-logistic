"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/stores/auth";

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.currentUser);
  const ready = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.role === "DRIVER") router.replace("/driver");
    else router.replace("/dashboard");
  }, [ready, user, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">Đang chuyển hướng...</p>
    </div>
  );
}
