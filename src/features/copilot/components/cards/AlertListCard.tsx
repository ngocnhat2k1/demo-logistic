"use client";
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils";
import { useCopilotStore } from "../../stores/copilot";
import type { AlertItem, ResultCard } from "../../types";

type C = Extract<ResultCard, { kind: "alerts" }>;

const TONE: Record<AlertItem["severity"], string> = {
  info: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

export function AlertListCard({ card }: { card: C }) {
  const close = useCopilotStore((s) => s.close);
  if (card.items.length === 0) return null;
  return (
    <div className="space-y-0.5 rounded-lg border bg-card p-2">
      {card.items.map((a, i) => {
        const body = (
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition hover:bg-muted">
            <AlertTriangle className={cn("h-3.5 w-3.5 shrink-0", TONE[a.severity])} />
            <span className="flex-1">{a.text}</span>
            {a.href && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          </div>
        );
        return a.href ? (
          <Link key={i} href={a.href} onClick={close}>
            {body}
          </Link>
        ) : (
          <div key={i}>{body}</div>
        );
      })}
    </div>
  );
}
