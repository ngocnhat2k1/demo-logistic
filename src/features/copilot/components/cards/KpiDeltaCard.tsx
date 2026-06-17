"use client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/shared/utils";
import type { ResultCard } from "../../types";

type C = Extract<ResultCard, { kind: "kpi" }>;

export function KpiDeltaCard({ card }: { card: C }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {card.items.map((k, i) => {
        const dir = k.deltaDir ?? "flat";
        const higherIsGood = k.good !== false;
        const isGood = dir === "flat" ? undefined : (dir === "up") === higherIsGood;
        const color = isGood === undefined ? "text-muted-foreground" : isGood ? "text-success" : "text-destructive";
        const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
        return (
          <div key={i} className="rounded-lg border bg-card p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <div className="mt-0.5 flex items-end justify-between gap-1">
              <span className="text-xl font-bold tabular-nums">{k.value}</span>
              {k.delta != null && k.delta !== 0 && (
                <span className={cn("flex items-center gap-0.5 text-[11px] font-medium", color)}>
                  <Icon className="h-3 w-3" />
                  {k.delta > 0 ? `+${k.delta}` : k.delta}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
