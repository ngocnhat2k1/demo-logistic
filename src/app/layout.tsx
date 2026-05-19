import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "sonner";
import { HydrationGate } from "@/shared/components/HydrationGate";
import { RealtimeProvider } from "@/shared/components/realtime/RealtimeProvider";

export const metadata: Metadata = {
  title: "Tratimex",
  description: "Tratimex — Quản lý điều độ và phương tiện vận tải",
  icons: {
    icon: "/favicon.ico",
  },
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
