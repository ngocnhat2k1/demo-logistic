"use client";

import { Topbar } from "@/shared/components/Topbar";
import { DispatchBoard } from "@/features/dispatch/components/Board";

export default function DispatchPage() {
  return (
    <>
      <Topbar title="Điều phối xe" />
      <div className="flex-1 overflow-hidden p-3 md:p-4">
        <DispatchBoard />
      </div>
    </>
  );
}
