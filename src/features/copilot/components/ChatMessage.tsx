"use client";
import { useState } from "react";
import { StreamingText } from "@/shared/ui/ai/StreamingText";
import { ConfidenceBadge } from "@/shared/ui/ai/ConfidenceBadge";
import { CardRenderer } from "./cards/CardRenderer";
import { ChipRow } from "./SuggestedPromptChips";
import type { ChatMessage } from "../types";

export function ChatMessageView({ message }: { message: ChatMessage }) {
  const [textDone, setTextDone] = useState(!message.streaming);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
        <StreamingText text={message.text} enabled={!!message.streaming} onDone={() => setTextDone(true)} />
        {textDone && message.confidence != null && message.confidence > 0 && (
          <div className="mt-1.5">
            <ConfidenceBadge value={message.confidence} />
          </div>
        )}
      </div>
      {textDone &&
        message.cards?.map((c, i) => (
          <div key={i} className="animate-in fade-in-0 slide-in-from-bottom-1" style={{ animationDelay: `${i * 80}ms` }}>
            <CardRenderer card={c} />
          </div>
        ))}
      {textDone && message.followUps && message.followUps.length > 0 && <ChipRow chips={message.followUps} />}
    </div>
  );
}
