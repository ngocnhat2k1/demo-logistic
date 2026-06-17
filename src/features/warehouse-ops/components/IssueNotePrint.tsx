"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";

import { useDataStore } from "@/shared/stores/data";
import { formatKg } from "@/shared/utils";

interface Line {
  productId: string;
  quantity: number;
}

/**
 * Phiếu xuất kho thủ công — chỉ hiện khi in (CSS `.print-area`), ẩn trên màn hình.
 */
export function IssueNotePrint({
  warehouseId,
  lines,
  note,
  code,
}: {
  warehouseId: string;
  lines: Line[];
  note?: string;
  code?: string;
}) {
  const warehouses = useDataStore((s) => s.warehouses);
  const products = useDataStore((s) => s.products);

  const warehouse = warehouses.find((w) => w.id === warehouseId);
  const rows = lines
    .filter((l) => l.productId && l.quantity > 0)
    .map((l) => {
      const p = products.find((pp) => pp.id === l.productId);
      return {
        sku: p?.sku ?? l.productId,
        name: p?.name ?? "—",
        unit: p?.unit ?? "",
        unitWeightKg: p?.unitWeightKg ?? 0,
        quantity: l.quantity,
      };
    });
  const totalWeight = rows.reduce((s, r) => s + r.unitWeightKg * r.quantity, 0);

  return (
    <div className="print-area">
      <div style={{ fontFamily: "sans-serif", fontSize: 13, lineHeight: 1.5, maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{warehouse?.name ?? "Kho"}</div>
            <div style={{ fontSize: 12 }}>{warehouse?.location.address ?? ""}</div>
            {warehouse?.contactPhone && <div style={{ fontSize: 12 }}>ĐT: {warehouse.contactPhone}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: 18, textTransform: "uppercase" }}>Phiếu xuất kho</div>
            {code && <div style={{ fontSize: 12 }}>Số: {code}</div>}
            <div style={{ fontSize: 12 }}>Ngày: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: vi })}</div>
          </div>
        </div>

        {note && (
          <div style={{ marginTop: 10, fontSize: 13 }}>
            <strong>Lý do / Nơi nhận:</strong> {note}
          </div>
        )}

        <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["STT", "Mã SKU", "Tên hàng", "ĐVT", "SL", "TL (kg)"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    border: "1px solid #000",
                    padding: "4px 6px",
                    textAlign: i >= 4 ? "right" : "left",
                    background: "#f0f0f0",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ border: "1px solid #000", padding: 8, textAlign: "center" }}>
                  (Chưa có dòng hàng)
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={`${r.sku}-${i}`}>
                <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{i + 1}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{r.sku}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{r.name}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{r.unit}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>{r.quantity}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                  {formatKg(r.unitWeightKg * r.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 8, textAlign: "right", fontSize: 13 }}>
          <strong>Tổng trọng lượng ước tính:</strong> {formatKg(totalWeight)}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, textAlign: "center" }}>
          <div style={{ width: "30%" }}>
            <div style={{ fontWeight: 700 }}>Thủ kho</div>
            <div style={{ fontSize: 11, fontStyle: "italic" }}>(Ký, ghi rõ họ tên)</div>
            <div style={{ height: 60 }} />
          </div>
          <div style={{ width: "30%" }}>
            <div style={{ fontWeight: 700 }}>Người nhận</div>
            <div style={{ fontSize: 11, fontStyle: "italic" }}>(Ký, ghi rõ họ tên)</div>
            <div style={{ height: 60 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
