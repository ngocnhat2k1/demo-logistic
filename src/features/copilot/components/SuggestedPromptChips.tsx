"use client";
import { useCopilotStore } from "../stores/copilot";

export function ChipRow({ chips }: { chips: string[] }) {
  const send = useCopilotStore((s) => s.sendMessage);
  const isThinking = useCopilotStore((s) => s.isThinking);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <button
          key={i}
          disabled={isThinking}
          onClick={() => send(c)}
          className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-50"
        >
          {c}
        </button>
      ))}
    </div>
  );
}
