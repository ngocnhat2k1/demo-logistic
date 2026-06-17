"use client";
import { useEffect, useRef } from "react";
import { useCopilotStore } from "../stores/copilot";
import { ChatMessageView } from "./ChatMessage";
import { TypingDots } from "@/shared/ui/ai/TypingDots";

export function MessageList() {
  const messages = useCopilotStore((s) => s.messages);
  const isThinking = useCopilotStore((s) => s.isThinking);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((m) => (
        <ChatMessageView key={m.id} message={m} />
      ))}
      {isThinking && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex h-7 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <TypingDots />
          </span>
          <span className="text-xs">Trợ lý đang phân tích…</span>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
