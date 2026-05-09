"use client";

import dynamic from "next/dynamic";

export const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <p className="text-sm text-muted-foreground">Đang tải bản đồ...</p>
    </div>
  ),
});
