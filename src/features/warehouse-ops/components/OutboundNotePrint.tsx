"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";

import { useDataStore } from "@/shared/stores/data";
import { deriveItemsWeight } from "@/features/warehouses/domain/inventory";
import { formatKg } from "@/shared/utils";
import type { Order } from "@/shared/types";

/**
 * Phiếu xuất kho — chỉ hiển thị khi in (CSS `.print-area`), ẩn trên màn hình.
 * Mount cùng chỗ với nút "In phiếu xuất kho"; gọi window.print() để in.
 */
export function OutboundNotePrint({ order }: { order: Order | null }) {
  const warehouses = useDataStore((s) => s.warehouses);
  const customers = useDataStore((s) => s.customers);
  const vehicles = useDataStore((s) => s.vehicles);
  const products = useDataStore((s) => s.products);

  if (!order) return null;

  const unitOf = (productId: string) => products.find((p) => p.id === productId)?.unit ?? "";

  const warehouse = warehouses.find((w) => w.id === order.warehouseId);
  const customer = customers.find((c) => c.id === order.customerId);
  const assignment = order.assignments[0];
  const vehicle = assignment ? vehicles.find((v) => v.id === assignment.vehicleId) : null;
  const items = order.items ?? [];
  const planned = order.declaredWeightKg ?? order.weightKg;
  const actual = order.actualWeightKg;

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
            <div style={{ fontSize: 12 }}>Số: {order.code}</div>
            <div style={{ fontSize: 12 }}>Ngày: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: vi })}</div>
          </div>
        </div>

        <table style={{ width: "100%", marginTop: 12, fontSize: 13 }}>
          <tbody>
            <tr>
              <td style={{ padding: "2px 0", width: "50%" }}>
                <strong>Khách hàng:</strong> {customer?.name ?? "—"}
              </td>
              <td style={{ padding: "2px 0" }}>
                <strong>SĐT:</strong> {customer?.phone ?? "—"}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "2px 0" }}>
                <strong>Điểm giao:</strong> {order.dropoff.address}
              </td>
              <td style={{ padding: "2px 0" }}>
                <strong>Xe / Tài xế:</strong>{" "}
                {vehicle ? `${vehicle.plateNumber} · ${vehicle.driverName}` : "—"}
              </td>
            </tr>
          </tbody>
        </table>

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
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>
                  (Không có dòng hàng)
                </td>
              </tr>
            )}
            {items.map((it, i) => (
              <tr key={`${it.productId}-${i}`}>
                <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{i + 1}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{it.sku}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{it.name}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{unitOf(it.productId)}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>{it.quantity}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                  {formatKg(it.unitWeightKg * it.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <table style={{ width: "100%", marginTop: 10, fontSize: 13 }}>
          <tbody>
            <tr>
              <td style={{ padding: "2px 0" }}>
                <strong>TL kế hoạch (khai báo):</strong> {formatKg(planned)}
              </td>
              <td style={{ padding: "2px 0" }}>
                <strong>TL thực tế (cân):</strong> {actual != null ? formatKg(actual) : "—"}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "2px 0" }}>
                <strong>TL suy ra từ SKU:</strong> {formatKg(deriveItemsWeight(items))}
              </td>
              <td style={{ padding: "2px 0" }}>
                <strong>Chênh lệch:</strong>{" "}
                {actual != null ? `${actual - planned > 0 ? "+" : ""}${formatKg(actual - planned)}` : "—"}
              </td>
            </tr>
            {order.extraCostNote && (
              <tr>
                <td colSpan={2} style={{ padding: "2px 0" }}>
                  <strong>Ghi chú chi phí:</strong> {order.extraCostNote}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, textAlign: "center" }}>
          <div style={{ width: "30%" }}>
            <div style={{ fontWeight: 700 }}>Thủ kho</div>
            <div style={{ fontSize: 11, fontStyle: "italic" }}>(Ký, ghi rõ họ tên)</div>
            <div style={{ height: 60 }} />
          </div>
          <div style={{ width: "30%" }}>
            <div style={{ fontWeight: 700 }}>Người nhận / Tài xế</div>
            <div style={{ fontSize: 11, fontStyle: "italic" }}>(Ký, ghi rõ họ tên)</div>
            {order.signature ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={order.signature} alt="Chữ ký" style={{ height: 60, objectFit: "contain", margin: "0 auto" }} />
            ) : (
              <div style={{ height: 60 }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
