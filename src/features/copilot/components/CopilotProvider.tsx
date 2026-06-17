"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/stores/auth";
import { ADMIN_ROLES } from "@/shared/ai/constants";
import { useCopilotStore } from "../stores/copilot";
import { CopilotLauncher } from "./CopilotLauncher";
import { CopilotPanel } from "./CopilotPanel";

/** Mount 1 lần trong layout admin: nút nổi + panel + phím tắt Ctrl/Cmd+K. Chỉ hiện cho vai trò admin. */
export function CopilotProvider() {
  const user = useAuthStore((s) => s.currentUser);
  const ready = useAuthStore((s) => s._hasHydrated);
  const toggle = useCopilotStore((s) => s.toggle);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  if (!ready || !user) return null;
  if (!(ADMIN_ROLES as readonly string[]).includes(user.role)) return null;

  return (
    <>
      <CopilotLauncher />
      <CopilotPanel />
    </>
  );
}
