"use client";
import type { ResultCard } from "../../types";

type C = Extract<ResultCard, { kind: "timeline" }>;

export function EventTimelineCard({ card }: { card: C }) {
  if (card.items.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card p-3">
      <ol className="relative space-y-3 border-l border-muted pl-4">
        {card.items.map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[1.07rem] top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            <p className="text-xs font-medium">{e.label}</p>
            {e.detail && <p className="text-[11px] text-muted-foreground">{e.detail}</p>}
            <p className="text-[10px] text-muted-foreground">{e.at}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
