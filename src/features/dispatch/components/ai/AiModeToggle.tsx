"use client";
import { Sparkles } from "lucide-react";
import { Switch } from "@/shared/ui/switch";

export function AiModeToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
        <Sparkles className="h-3.5 w-3.5" /> Chế độ AI
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
