"use client";
import { Sparkles } from "lucide-react";
import { useCopilotStore } from "../stores/copilot";

export function CopilotLauncher() {
  const isOpen = useCopilotStore((s) => s.isOpen);
  const toggle = useCopilotStore((s) => s.toggle);
  if (isOpen) return null;
  return (
    <button
      onClick={toggle}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105"
      aria-label="Mở Trợ lý AI (Ctrl/Cmd + K)"
      title="Trợ lý điều phối AI (Ctrl/Cmd + K)"
    >
      <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full bg-success ring-2 ring-background" />
      <Sparkles className="h-6 w-6" />
    </button>
  );
}
