"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { useCopilotStore } from "../../stores/copilot";
import type { ResultCard } from "../../types";

type C = Extract<ResultCard, { kind: "orders" }>;

export function OrderResultCard({ card }: { card: C }) {
  const close = useCopilotStore((s) => s.close);
  return (
    <div className="rounded-lg border bg-card p-2 text-xs">
      {card.title && (
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{card.title}</p>
      )}
      <div className="space-y-0.5">
        {card.items.map((it) => (
          <Link
            key={it.id}
            href={it.href}
            onClick={close}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-muted"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold text-primary">{it.code}</span>
                <Badge variant={it.statusTone} className="px-1.5 py-0 text-[9px]">
                  {it.statusLabel}
                </Badge>
              </div>
              <p className="truncate text-muted-foreground">{it.customerName}</p>
            </div>
            {it.meta && <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{it.meta}</span>}
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
