"use client";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Progress } from "@/shared/ui/progress";
import { ANALYZE_STEP_MS } from "@/shared/ai/constants";

const STEPS = ["Đọc lịch sử giao hàng", "Tính rủi ro & ETA", "Gom cụm tuyến"];

/** Banner giả lập "AI đang phân tích…" — chạy 3 bước rồi tự ẩn. runKey đổi → phát lại. */
export function AIAnalyzingBanner({ orderCount, runKey }: { orderCount: number; runKey: string | number }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setStep(0);
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      if (i >= STEPS.length) {
        clearInterval(id);
        setDone(true);
      } else {
        setStep(i);
      }
    }, ANALYZE_STEP_MS);
    return () => clearInterval(id);
  }, [runKey]);

  if (done) return null;
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs">
      <div className="mb-1.5 flex items-center gap-1.5 text-primary">
        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
        <span className="font-medium">AI đang phân tích {orderCount} đơn chờ…</span>
      </div>
      <p className="mb-1.5 text-[11px] text-muted-foreground">
        {STEPS[step]}
        <span className="animate-pulse">▍</span>
      </p>
      <Progress value={((step + 1) / STEPS.length) * 100} className="h-1" />
    </div>
  );
}
