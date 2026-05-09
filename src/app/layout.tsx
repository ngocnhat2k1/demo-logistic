import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "sonner";
import { HydrationGate } from "@/shared/components/HydrationGate";
import { RealtimeProvider } from "@/shared/components/realtime/RealtimeProvider";

export const metadata: Metadata = {
  title: "Hệ thống Điều độ Phương tiện | Demo POC",
  description: "Demo POC quản lý điều độ và phương tiện vận tải",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased">
        <HydrationGate>
          <RealtimeProvider>{children}</RealtimeProvider>
        </HydrationGate>
        <Toaster richColors position="top-right" expand />
      </body>
    </html>
  );
}
