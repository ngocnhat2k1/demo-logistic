"use client";

import { Topbar } from "@/components/shared/Topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/lib/stores/data";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, FileSpreadsheet, Download } from "lucide-react";
import { toast } from "sonner";
import { PLACES } from "@/lib/mock/geo";

interface ParsedRow {
  customerCode: string;
  pickup: string;
  dropoff: string;
  weightKg: number;
  description: string;
  ok: boolean;
  error?: string;
}

export default function ImportPage() {
  const router = useRouter();
  const customers = useDataStore((s) => s.customers);
  const createOrder = useDataStore((s) => s.createOrder);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const parsed: ParsedRow[] = data.map((r) => {
        const code = String(r.customerCode || r.MaKH || "");
        const pickup = String(r.pickup || r.DiemLay || "Kho Tân Bình, HCM");
        const dropoff = String(r.dropoff || r.DiemGiao || "");
        const weightKg = Number(r.weightKg || r.KhoiLuong || 0);
        const description = String(r.description || r.MoTa || "");
        const customer = customers.find((c) => c.code === code || c.name === code);
        const ok = !!customer && weightKg > 0 && !!dropoff;
        return {
          customerCode: code,
          pickup,
          dropoff,
          weightKg,
          description,
          ok,
          error: !customer ? "Không tìm thấy KH" : weightKg <= 0 ? "KL phải > 0" : !dropoff ? "Thiếu điểm giao" : undefined,
        };
      });
      setRows(parsed);
      toast.success(`Đã đọc ${parsed.length} dòng từ file`);
    } catch (err) {
      toast.error("Không đọc được file Excel: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function loadDemo() {
    const demo: ParsedRow[] = customers.slice(0, 8).map((c, i) => ({
      customerCode: c.code,
      pickup: "Kho TT Tân Bình, HCM",
      dropoff: ["Bình Dương", "Đồng Nai", "Cần Thơ", "Vũng Tàu", "Long An"][i % 5],
      weightKg: [500, 800, 1200, 2000, 3500][i % 5],
      description: ["Hàng tiêu dùng", "Vật liệu XD", "Linh kiện ĐT"][i % 3],
      ok: true,
    }));
    setRows(demo);
    toast.info(`Đã load demo data: ${demo.length} đơn`);
  }

  function commit() {
    let n = 0;
    rows.forEach((r) => {
      if (!r.ok) return;
      const c = customers.find((cc) => cc.code === r.customerCode);
      if (!c) return;
      const pickup = PLACES.HCM_KHO_TAN_BINH;
      const dropPlace = Object.values(PLACES).find((p) => p.name.includes(r.dropoff)) ?? PLACES.BD_DI_AN;
      createOrder({
        customerId: c.id,
        pickup: { address: pickup.name, lat: pickup.lat, lng: pickup.lng, contactName: "Kho", contactPhone: "0900000000" },
        dropoff: { address: dropPlace.name, lat: dropPlace.lat, lng: dropPlace.lng, contactName: c.name, contactPhone: c.phone },
        weightKg: r.weightKg,
        description: r.description || "Hàng",
        requestedDeliveryAt: new Date(Date.now() + 86400000).toISOString(),
        source: "IMPORT",
        status: "PENDING_DISPATCH",
      });
      n++;
    });
    toast.success(`Đã tạo ${n} đơn từ file Excel`);
    router.push("/orders");
  }

  function downloadTemplate() {
    const csv =
      "customerCode,pickup,dropoff,weightKg,description\n" +
      "KH-001,HCM Tân Bình,Bình Dương,500,Hàng tiêu dùng\n" +
      "KH-002,HCM Tân Bình,Đồng Nai,800,Vật liệu xây dựng";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-template.csv";
    a.click();
  }

  return (
    <>
      <Topbar title="Import đơn từ Excel" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Upload file</CardTitle>
            <CardDescription>Cột yêu cầu: customerCode, pickup, dropoff, weightKg, description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} disabled={loading} className="text-sm" />
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4" /> Tải template
              </Button>
              <Button variant="secondary" size="sm" onClick={loadDemo}>
                <FileSpreadsheet className="h-4 w-4" /> Load demo data (8 đơn)
              </Button>
            </div>
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Preview ({rows.filter((r) => r.ok).length}/{rows.length} hợp lệ)</CardTitle>
                <Button onClick={commit} disabled={!rows.some((r) => r.ok)}>
                  Tạo {rows.filter((r) => r.ok).length} đơn
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-2">Mã KH</th>
                    <th className="px-4 py-2">Lấy</th>
                    <th className="px-4 py-2">Giao</th>
                    <th className="px-4 py-2">KL</th>
                    <th className="px-4 py-2">Mô tả</th>
                    <th className="px-4 py-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={`border-t ${r.ok ? "" : "bg-destructive/5"}`}>
                      <td className="px-4 py-2 font-mono text-xs">{r.customerCode}</td>
                      <td className="px-4 py-2 text-xs">{r.pickup}</td>
                      <td className="px-4 py-2 text-xs">{r.dropoff}</td>
                      <td className="px-4 py-2">{r.weightKg}</td>
                      <td className="px-4 py-2 text-xs">{r.description}</td>
                      <td className="px-4 py-2">
                        {r.ok ? (
                          <span className="text-success">✓ OK</span>
                        ) : (
                          <span className="text-destructive">✗ {r.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
