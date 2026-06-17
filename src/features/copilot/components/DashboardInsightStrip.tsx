"use client";
import { useMemo } from "react";
import { useDataStore } from "@/shared/stores/data";
import { InsightCard } from "@/shared/ui/ai/InsightCard";
import { AIBadge } from "@/shared/ui/ai/AIBadge";
import { useCopilotStore } from "../stores/copilot";
import { generateInsights } from "../domain/insights";
import type { Insight } from "@/shared/ai/types";

/** Dải auto-insight do AI gieo trên Dashboard — cùng engine với Copilot. */
export function DashboardInsightStrip() {
  const orders = useDataStore((s) => s.orders);
  const vehicles = useDataStore((s) => s.vehicles);
  const customers = useDataStore((s) => s.customers);
  const returns = useDataStore((s) => s.returns);
  const sos = useDataStore((s) => s.sos);
  const warehouses = useDataStore((s) => s.warehouses);
  const carriers = useDataStore((s) => s.carriers);

  const dismissed = useCopilotStore((s) => s.dismissedInsightIds);
  const dismiss = useCopilotStore((s) => s.dismissInsight);
  const open = useCopilotStore((s) => s.open);
  const send = useCopilotStore((s) => s.sendMessage);

  const insights = useMemo(
    () =>
      generateInsights({ orders, vehicles, customers, returns, sos, warehouses, carriers }).filter(
        (i) => !dismissed.includes(i.id)
      ),
    [orders, vehicles, customers, returns, sos, warehouses, carriers, dismissed]
  );

  if (insights.length === 0) return null;

  function onAction(i: Insight) {
    if (i.cta?.prompt) {
      open();
      send(i.cta.prompt);
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Trợ lý AI tổng hợp</h2>
        <AIBadge />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((i) => (
          <InsightCard key={i.id} insight={i} onAction={onAction} onDismiss={dismiss} />
        ))}
      </div>
    </section>
  );
}
