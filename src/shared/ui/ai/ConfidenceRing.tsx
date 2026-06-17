"use client";
import { useEffect, useState } from "react";
import { cn } from "@/shared/utils";
import { bandOf } from "@/shared/ai/confidence";

const RING_COLOR: Record<string, string> = {
  high: "#16a34a",
  medium: "#d97706",
  low: "#9ca3af",
};

/** Vòng tròn độ tin cậy (SVG) — vẽ dần khi xuất hiện. */
export function ConfidenceRing({
  value,
  size = 44,
  stroke = 5,
  className,
  animate = true,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  animate?: boolean;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [shown, setShown] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setShown(value);
      return;
    }
    setShown(0);
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value, animate]);

  const color = RING_COLOR[bandOf(value)];
  const offset = circ * (1 - Math.max(0, Math.min(100, shown)) / 100);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted-foreground/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease-out" }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums" style={{ color }}>
        {Math.round(value)}
      </span>
    </div>
  );
}
