import { cn } from "@/shared/utils";
import { bandOf, CONFIDENCE_BANDS } from "@/shared/ai/confidence";

/** Nhãn "Độ tin cậy NN%" đổi màu theo dải tin cậy. */
export function ConfidenceBadge({ value, className }: { value: number; className?: string }) {
  const meta = CONFIDENCE_BANDS[bandOf(value)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        meta.className,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      Độ tin cậy {Math.round(value)}%
    </span>
  );
}
