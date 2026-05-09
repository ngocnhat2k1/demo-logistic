"use client";

import { useState } from "react";
import { FileSpreadsheet, Download, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { useDataStore } from "@/shared/stores/data";
import { PLACES } from "@/shared/mock/geo";

interface ParsedRow {
  customerCode: string;
  pickup: string;
  dropoff: string;
  weightKg: number;
  description: string;
  ok: boolean;
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportOrderDialog({ open, onOpenChange }: Props) {
  const customers = useDataStore((s) => s.customers);
  const createOrder = useDataStore((s) => s.createOrder);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);

  function handleOpenChange(val: boolean) {
    if (!val) setRows([]);
    onOpenChange(val);
  }

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
          error: !customer
            ? "Không tìm thấy KH"
            : weightKg <= 0
            ? "KL phải > 0"
            : !dropoff
            ? "Thiếu điểm giao"
            : undefined,
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
      const dropPlace =
        Object.values(PLACES).find((p) => p.name.includes(r.dropoff)) ??
        PLACES.BD_DI_AN;
      createOrder({
        customerId: c.id,
        pickup: {
          address: pickup.name,
          lat: pickup.lat,
          lng: pickup.lng,
          contactName: "Kho",
          contactPhone: "0900000000",
        },
        dropoff: {
          address: dropPlace.name,
          lat: dropPlace.lat,
          lng: dropPlace.lng,
          contactName: c.name,
          contactPhone: c.phone,
        },
        weightKg: r.weightKg,
        description: r.description || "Hàng",
        requestedDeliveryAt: new Date(Date.now() + 86400000).toISOString(),
        source: "IMPORT",
        status: "PENDING_DISPATCH",
      });
      n++;
    });
    toast.success(`Đã tạo ${n} đơn từ file Excel`);
    handleOpenChange(false);
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

  const validCount = rows.filter((r) => r.ok).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import đơn từ Excel</DialogTitle>
          <DialogDescription>
            Cột yêu cầu: customerCode, pickup, dropoff, weightKg, description
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border text-sm hover:bg-muted transition-colors">
              <Upload className="h-4 w-4" />
              Chọn file Excel / CSV
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onFile}
                disabled={loading}
                className="hidden"
              />
            </label>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Tải template
            </Button>
            <Button variant="secondary" size="sm" onClick={loadDemo}>
              <FileSpreadsheet className="h-4 w-4" /> Load demo data (8 đơn)
            </Button>
            {loading && (
              <span className="text-sm text-muted-foreground">Đang đọc file...</span>
            )}
          </div>

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{validCount}</span>/{rows.length} dòng hợp lệ
                </p>
                <Button
                  size="sm"
                  onClick={commit}
                  disabled={validCount === 0}
                >
                  Tạo {validCount} đơn
                </Button>
              </div>

              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-medium">Mã KH</th>
                        <th className="px-3 py-2 font-medium">Lấy</th>
                        <th className="px-3 py-2 font-medium">Giao</th>
                        <th className="px-3 py-2 font-medium">KL</th>
                        <th className="px-3 py-2 font-medium">Mô tả</th>
                        <th className="px-3 py-2 font-medium">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr
                          key={i}
                          className={`border-t ${r.ok ? "" : "bg-destructive/5"}`}
                        >
                          <td className="px-3 py-1.5 font-mono text-xs">{r.customerCode}</td>
                          <td className="px-3 py-1.5 text-xs">{r.pickup}</td>
                          <td className="px-3 py-1.5 text-xs">{r.dropoff}</td>
                          <td className="px-3 py-1.5">{r.weightKg}</td>
                          <td className="px-3 py-1.5 text-xs">{r.description}</td>
                          <td className="px-3 py-1.5">
                            {r.ok ? (
                              <span className="text-green-600 text-xs">✓ OK</span>
                            ) : (
                              <span className="text-destructive text-xs">✗ {r.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
