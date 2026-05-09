"use client";

import { Topbar } from "@/components/shared/Topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDataStore } from "@/lib/stores/data";
import { Cable, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function CyberSyncPage() {
  const cyberLog = useDataStore((s) => s.cyberLog);
  const importCyberOrders = useDataStore((s) => s.importCyberOrders);
  const pushNotification = useDataStore((s) => s.pushNotification);
  const [loading, setLoading] = useState(false);

  async function pull() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    const orders = importCyberOrders(5);
    pushNotification({
      type: "CYBER_SYNC",
      severity: "info",
      title: "Đồng bộ Cyber",
      message: `Đã nhận ${orders.length} đơn từ Cyber ERP`,
      targetRoles: ["DISPATCHER", "OPS_MANAGER"],
    });
    toast.success(`Đã đồng bộ ${orders.length} đơn từ Cyber`);
    setLoading(false);
  }

  return (
    <>
      <Topbar title="Tích hợp Cyber ERP" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Cable className="h-4 w-4" /> Trạng thái kết nối
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="success" className="flex items-center gap-1 w-fit">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">Endpoint: https://api.cyber.demo/v2 (mock)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Đồng bộ Khách hàng</CardTitle>
              <CardDescription>Last sync: 5 phút trước</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" disabled>
                <RefreshCw className="h-4 w-4" /> Sync KH (demo only pull đơn)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Đồng bộ Đơn hàng</CardTitle>
              <CardDescription>Last sync: {cyberLog[0] ? format(new Date(cyberLog[0].at), "HH:mm", { locale: vi }) : "—"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={pull} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Pull đơn mới
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lịch sử đồng bộ</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Thời gian</th>
                  <th className="px-4 py-3 font-medium">Loại</th>
                  <th className="px-4 py-3 font-medium">Số lượng</th>
                  <th className="px-4 py-3 font-medium">Kết quả</th>
                  <th className="px-4 py-3 font-medium">Thông điệp</th>
                </tr>
              </thead>
              <tbody>
                {cyberLog.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Chưa có lịch sử đồng bộ. Hãy click &quot;Pull đơn mới&quot; để thử.</td></tr>
                )}
                {cyberLog.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(e.at), "dd/MM HH:mm:ss", { locale: vi })}
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline">{e.kind}</Badge></td>
                    <td className="px-4 py-3 font-medium">{e.count}</td>
                    <td className="px-4 py-3">
                      <Badge variant={e.ok ? "success" : "destructive"}>{e.ok ? "OK" : "FAILED"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
