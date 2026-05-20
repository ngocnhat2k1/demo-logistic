"use client";

import { Topbar } from "@/shared/components/Topbar";
import { ApprovalsQueue } from "@/features/approvals/components/ApprovalsQueue";

export default function ApprovalsPage() {
  return (
    <>
      <Topbar title="Duyệt nhà xe dự phòng" />
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        <ApprovalsQueue />
      </div>
    </>
  );
}
