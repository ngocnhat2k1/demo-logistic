"use client";
import { useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/shared/utils";
import { useCopilotStore } from "../stores/copilot";
import { MessageList } from "./MessageList";
import { PromptComposer } from "./PromptComposer";

export function CopilotPanel() {
  const isOpen = useCopilotStore((s) => s.isOpen);
  const close = useCopilotStore((s) => s.close);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, close]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={close}
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l bg-background shadow-xl transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!isOpen}
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Trợ lý điều phối AI</p>
              <p className="text-[10px] text-muted-foreground">Demo • dữ liệu mô phỏng</p>
            </div>
          </div>
          <button onClick={close} className="text-muted-foreground transition hover:text-foreground" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </header>
        <MessageList />
        <PromptComposer />
      </aside>
    </>
  );
}
