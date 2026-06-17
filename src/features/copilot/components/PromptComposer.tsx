"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import { useDataStore } from "@/shared/stores/data";
import { useCopilotStore } from "../stores/copilot";
import { defaultPrompts } from "../domain/insights";
import { ChipRow } from "./SuggestedPromptChips";

export function PromptComposer() {
  const [text, setText] = useState("");
  const send = useCopilotStore((s) => s.sendMessage);
  const isThinking = useCopilotStore((s) => s.isThinking);
  const messages = useCopilotStore((s) => s.messages);
  const orders = useDataStore((s) => s.orders);
  const showChips = messages.length <= 1;

  function submit() {
    if (!text.trim() || isThinking) return;
    send(text);
    setText("");
  }

  return (
    <div className="space-y-2 border-t p-3">
      {showChips && <ChipRow chips={defaultPrompts(orders)} />}
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Hỏi về đơn, xe, khách hàng…"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={submit}
          disabled={isThinking || !text.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          aria-label="Gửi"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
