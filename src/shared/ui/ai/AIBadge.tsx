import { Sparkles } from "lucide-react";
import { cn } from "@/shared/utils";

/** Badge "AI" có icon lấp lánh + hiệu ứng nhấp nháy. */
export function AIBadge({
  label = "AI",
  pulse = true,
  className,
}: {
  label?: string;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary",
        className
      )}
    >
      <Sparkles className={cn("h-3 w-3", pulse && "animate-pulse")} />
      {label}
    </span>
  );
}
