"use client";
import { cn } from "@/shared/utils";
import { useTypewriter } from "@/shared/ai/useTypewriter";

/** Văn bản gõ-từng-chữ (giả lập streaming). enabled=false → hiện ngay. */
export function StreamingText({
  text,
  enabled = true,
  cursor = true,
  className,
  onDone,
}: {
  text: string;
  enabled?: boolean;
  cursor?: boolean;
  className?: string;
  onDone?: () => void;
}) {
  const { shown, done } = useTypewriter(text, { enabled, onDone });
  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {shown}
      {cursor && !done && <span className="ml-0.5 inline-block animate-pulse">▍</span>}
    </span>
  );
}
