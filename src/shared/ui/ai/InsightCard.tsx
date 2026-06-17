"use client";
import Link from "next/link";
import { X, ArrowRight, AlertTriangle, TrendingUp, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/shared/utils";
import { AIBadge } from "./AIBadge";
import type { AiSeverity, Insight } from "@/shared/ai/types";

const TONE: Record<AiSeverity, { bar: string; icon: typeof Info; iconColor: string }> = {
  info: { bar: "bg-primary", icon: Info, iconColor: "text-primary" },
  success: { bar: "bg-success", icon: CheckCircle2, iconColor: "text-success" },
  warning: { bar: "bg-warning", icon: AlertTriangle, iconColor: "text-warning" },
  danger: { bar: "bg-destructive", icon: AlertTriangle, iconColor: "text-destructive" },
};

/** Card 1 insight tự sinh: thanh màu severity, icon, câu tiếng Việt, CTA (link hoặc gọi copilot). */
export function InsightCard({
  insight,
  onAction,
  onDismiss,
  className,
}: {
  insight: Insight;
  /** Gọi khi bấm CTA dạng prompt (mở copilot). */
  onAction?: (insight: Insight) => void;
  onDismiss?: (id: string) => void;
  className?: string;
}) {
  const tone = TONE[insight.severity];
  const Icon = insight.severity === "info" ? TrendingUp : tone.icon;
  const cta = insight.cta;

  return (
    <div
      className={cn(
        "relative flex gap-3 overflow-hidden rounded-lg border bg-card p-3 shadow-sm",
        className
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} />
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone.iconColor)} />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <p className="truncate text-xs font-semibold">{insight.title}</p>
          <AIBadge />
        </div>
        <p className="text-xs leading-snug text-muted-foreground">{insight.sentence}</p>
        {cta &&
          (cta.href ? (
            <Link
              href={cta.href}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              {cta.label} <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onAction?.(insight)}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              {cta.label} <ArrowRight className="h-3 w-3" />
            </button>
          ))}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={() => onDismiss(insight.id)}
          className="absolute right-1.5 top-1.5 text-muted-foreground/60 hover:text-foreground"
          aria-label="Bỏ qua"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
