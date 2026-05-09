"use client";

import { Topbar } from "@/components/shared/Topbar";
import { DispatchBoard } from "@/components/dispatch/Board";

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
