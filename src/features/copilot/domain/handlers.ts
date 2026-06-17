// Bộ xử lý intent: đọc dữ liệu store thật → CopilotResult (câu trả lời + result cards + độ tin cậy).
// TẤT ĐỊNH theo seed; KHÔNG gọi LLM/API.
import { startOfDay, subDays } from "date-fns";
import type { Order, OrderStatus, Vehicle, Customer, ReturnOrder, SosAlert, Warehouse, Carrier } from "@/shared/types";
import type { MapMarker } from "@/shared/map/MapCanvas";
import { haversine, formatKg, formatVnd } from "@/shared/utils";
import { normalizeVi } from "@/shared/ai/engine";
import { composeSentence, relativeTime } from "@/shared/ai/narrative";
import { toConfidence } from "@/shared/ai/confidence";
import { AREA_RADIUS_KM } from "@/shared/ai/constants";
import { suggestVehicles } from "@/features/dispatch/domain/dispatchHeuristic";
import { extractEntities } from "./entities";
import { matchIntent } from "./intents";
import { ORDER_STATUS_LABEL, statusTone, eventLabel, codStatusLabel } from "../utils/format";
import { STATIC_CHIPS } from "../constants";
import type {
  CopilotResult,
  OrderCardItem,
  ResultCard,
  SuggestionItem,
  TimelineItem,
  VehicleCardItem,
} from "../types";

export interface CopilotData {
  orders: Order[];
  vehicles: Vehicle[];
  customers: Customer[];
  returns: ReturnOrder[];
  sos: SosAlert[];
  warehouses: Warehouse[];
  carriers: Carrier[];
}

const ACTIVE_LATE = new Set<OrderStatus>([
  "PENDING_DISPATCH",
  "PENDING_ACCEPT",
  "PENDING_SUPERVISOR_REVIEW",
  "DISPATCHED",
  "PICKED_UP",
  "IN_TRANSIT",
]);

const customerName = (data: CopilotData, id: string) =>
  data.customers.find((c) => c.id === id)?.name ?? "—";

function orderItem(o: Order, data: CopilotData, meta?: string): OrderCardItem {
  return {
    id: o.id,
    code: o.code,
    customerName: customerName(data, o.customerId),
    statusLabel: ORDER_STATUS_LABEL[o.status],
    statusTone: statusTone(o.status),
    meta: meta ?? formatKg(o.weightKg),
    href: `/orders/${o.id}`,
  };
}

function buildTimeline(o: Order): TimelineItem[] {
  return o.events.slice(-8).map((e) => ({
    label: eventLabel(e.type),
    detail: typeof e.payload?.note === "string" ? (e.payload.note as string) : undefined,
    at: relativeTime(e.at),
  }));
}

function askForOrder(): CopilotResult {
  return {
    sentence: "Bạn cho mình mã đơn nhé (ví dụ DH-0007).",
    cards: [],
    confidence: 0,
    followUps: STATIC_CHIPS,
  };
}

function notFound(code: string): CopilotResult {
  return {
    sentence: `Mình không tìm thấy đơn ${code}. Bạn kiểm tra lại mã giúp nhé.`,
    cards: [],
    confidence: 0,
    followUps: STATIC_CHIPS,
  };
}

// ---------- Intent handlers ----------

function handleOrdersLate(data: CopilotData): CopilotResult {
  const now = Date.now();
  const late = data.orders
    .filter((o) => ACTIVE_LATE.has(o.status) && o.requestedDeliveryAt && new Date(o.requestedDeliveryAt).getTime() < now)
    .map((o) => ({ o, lateH: (now - new Date(o.requestedDeliveryAt).getTime()) / 3.6e6 }))
    .sort((a, b) => b.lateH - a.lateH);

  if (late.length === 0) {
    return { sentence: "Tin tốt — hiện không có đơn nào trễ hẹn giao. 🎉", cards: [], confidence: toConfidence(3, { base: 92 }) };
  }
  const top = late[0];
  const sentence = composeSentence(
    "Hiện có {n} đơn trễ hẹn giao. Nghiêm trọng nhất là {code} — quá {h} giờ so với hẹn, đang {st}.",
    { n: late.length, code: top.o.code, h: top.lateH.toFixed(1), st: ORDER_STATUS_LABEL[top.o.status] }
  );
  const items = late.slice(0, 6).map(({ o, lateH }) => orderItem(o, data, `trễ ${lateH.toFixed(1)} giờ`));
  return {
    sentence,
    cards: [{ kind: "orders", title: "Đơn trễ hẹn", items }],
    confidence: toConfidence(late.length, { base: 84, seed: "late" }),
    followUps: ["Tóm tắt hôm nay", "Xe rảnh ở khu vực HCM"],
  };
}

function handleFleetAvailable(text: string, data: CopilotData): CopilotResult {
  const entities = extractEntities(text);
  const center = entities.placeCenter;
  const label = entities.placeLabel ?? "toàn khu vực";
  const avail = data.vehicles.filter((v) => v.status === "AVAILABLE");
  let list = avail.map((v) => ({ v, d: center ? haversine(v.currentLocation, center) : 0 }));
  if (center) list = list.filter((x) => x.d <= AREA_RADIUS_KM);
  list.sort((a, b) => (center ? a.d - b.d : b.v.capacityKg - a.v.capacityKg));

  if (list.length === 0) {
    return {
      sentence: composeSentence("Hiện không có xe nào sẵn sàng quanh {p} (bán kính {r}km).", { p: label, r: AREA_RADIUS_KM }),
      cards: [],
      confidence: toConfidence(1, { base: 72 }),
      followUps: ["Xe rảnh ở khu vực HCM", "Tóm tắt hôm nay"],
    };
  }
  const top = list[0];
  const sentence = center
    ? composeSentence(
        "Có {n} xe đang sẵn sàng quanh {p} (bán kính {r}km). Gần nhất là {plate} — tài {drv}, cách {p} {d}km, còn trống {cap}.",
        { n: list.length, p: label, r: AREA_RADIUS_KM, plate: top.v.plateNumber, drv: top.v.driverName, d: top.d.toFixed(1), cap: formatKg(top.v.capacityKg) }
      )
    : composeSentence("Có {n} xe đang sẵn sàng. Tải lớn nhất: {plate} ({cap}).", {
        n: list.length,
        plate: top.v.plateNumber,
        cap: formatKg(top.v.capacityKg),
      });

  const items: VehicleCardItem[] = list.slice(0, 8).map(({ v, d }) => ({
    id: v.id,
    plate: v.plateNumber,
    driverName: v.driverName,
    statusLabel: "Sẵn sàng",
    statusTone: "success",
    distanceKm: center ? d : undefined,
    freeKg: v.capacityKg,
    lat: v.currentLocation.lat,
    lng: v.currentLocation.lng,
  }));
  const markers: MapMarker[] = items.map((it) => ({ id: it.id, lat: it.lat, lng: it.lng, kind: "vehicle-idle", popup: `${it.plate} • ${it.driverName}` }));
  if (center) markers.push({ id: "__center", lat: center.lat, lng: center.lng, kind: "dropoff", popup: label });

  const cards: ResultCard[] = [
    { kind: "vehicles", title: `Xe sẵn sàng quanh ${label}`, items },
    { kind: "map", markers, center, selectedId: null },
  ];
  return { sentence, cards, confidence: toConfidence(list.length, { base: 82, seed: label }), followUps: ["Đơn nào đang trễ?", "Tóm tắt hôm nay"] };
}

function handleWhyReturned(text: string, data: CopilotData): CopilotResult {
  const code = extractEntities(text).orderCode;
  if (!code) return askForOrder();
  const order = data.orders.find((o) => o.code === code);
  if (!order) return notFound(code);

  const ret = data.returns.find((r) => r.originalOrderId === order.id);
  const failEvent = [...order.events].reverse().find((e) => e.type === "DELIVERY_FAILED");
  const isReturnFlow =
    !!ret || !!failEvent || ["DELIVERY_FAILED", "RETURN_PROCESSING", "RETURNING_TO_WAREHOUSE", "RETURNED"].includes(order.status);

  if (!isReturnFlow) {
    return {
      sentence: composeSentence("{code} không có ghi nhận trả hàng — đơn đang ở trạng thái {st}.", { code, st: ORDER_STATUS_LABEL[order.status] }),
      cards: [{ kind: "orders", items: [orderItem(order, data)] }],
      confidence: toConfidence(2, { base: 80, seed: code }),
      followUps: [`Trạng thái đơn ${code}`],
    };
  }

  const reasonLabel = ret?.reasonLabel ?? String(failEvent?.payload?.reasonLabel ?? order.failureReasonId ?? "Không rõ");
  const refund = ret?.refundPercent ?? Number(failEvent?.payload?.refundPercent ?? 0);
  const notes = order.failureNotes ?? (typeof failEvent?.payload?.notes === "string" ? (failEvent.payload.notes as string) : "");
  const cat = ret?.reasonCategory === "FORCE_MAJEURE" ? "Bất khả kháng" : "Lỗi khách hàng";
  const sentence = composeSentence('{code} giao thất bại. Lý do: "{r}" (nhóm {c}, hoàn {p}% hạn mức).{n}{rr}', {
    code,
    r: reasonLabel,
    c: cat,
    p: refund,
    n: notes ? ` Tài xế ghi chú: "${notes}".` : "",
    rr: ret ? ` Đã tạo phiếu trả ${ret.code}, hàng ${ret.status === "COMPLETED" ? "đã về kho" : "đang về kho"}.` : "",
  });
  return {
    sentence,
    cards: [{ kind: "timeline", items: buildTimeline(order) }],
    confidence: toConfidence(4, { base: 88, seed: code }),
    followUps: ["Tóm tắt hôm nay"],
  };
}

function handleTodaySummary(data: CopilotData): CopilotResult {
  const now = new Date();
  const startToday = startOfDay(now);
  const startYest = subDays(startToday, 1);
  const inToday = (iso?: string) => !!iso && new Date(iso) >= startToday;
  const inYest = (iso?: string) => !!iso && new Date(iso) >= startYest && new Date(iso) < startToday;

  const createdToday = data.orders.filter((o) => inToday(o.createdAt)).length;
  const createdYest = data.orders.filter((o) => inYest(o.createdAt)).length;
  const deliveredToday = data.orders.filter((o) => inToday(o.deliveredAt)).length;
  const failedToday = data.orders.filter(
    (o) => (o.status === "DELIVERY_FAILED" || o.status === "RETURN_PROCESSING") && inToday(o.updatedAt)
  ).length;
  const busy = data.vehicles.filter((v) => v.status === "BUSY").length;
  const autoOrders = data.orders.filter((o) => o.events.some((e) => e.type === "AUTO_DISPATCHED"));
  const autoCount = autoOrders.length;
  const totalDone = deliveredToday + failedToday;
  const successRate = totalDone > 0 ? Math.round((deliveredToday / totalDone) * 100) : 100;

  const dir = (a: number, b: number): "up" | "down" | "flat" => (a > b ? "up" : a < b ? "down" : "flat");

  const kpi: ResultCard = {
    kind: "kpi",
    items: [
      { label: "Đơn mới", value: String(createdToday), delta: createdToday - createdYest, deltaDir: dir(createdToday, createdYest), good: true },
      { label: "Đã giao", value: String(deliveredToday), deltaDir: "flat", good: true },
      { label: "Giao thất bại", value: String(failedToday), deltaDir: "flat", good: false },
      { label: "Xe đang chạy", value: String(busy), deltaDir: "flat", good: true },
    ],
  };

  // Cảnh báo cần xử lý
  const alerts: ResultCard = { kind: "alerts", items: [] };
  const fallbackCount = data.orders.filter((o) => o.dispatchFallback).length;
  if (fallbackCount > 0) alerts.items.push({ severity: "warning", text: `${fallbackCount} đơn rớt điều phối cần xử lý tay`, href: "/dispatch" });
  const nearQuota = data.customers
    .filter((c) => c.quota.type !== "POSTPAID" && c.quota.limit > 0 && (c.quota.reserved + c.quota.used) / c.quota.limit >= 0.9)
    .sort((a, b) => (b.quota.reserved + b.quota.used) / b.quota.limit - (a.quota.reserved + a.quota.used) / a.quota.limit);
  if (nearQuota[0]) {
    const c = nearQuota[0];
    const pct = Math.round(((c.quota.reserved + c.quota.used) / c.quota.limit) * 100);
    alerts.items.push({ severity: pct >= 100 ? "danger" : "warning", text: `KH "${c.name}" đã dùng ${pct}% hạn mức`, href: `/customers/${c.id}` });
  }
  const openSos = data.sos.filter((s) => !s.resolved).length;
  if (openSos > 0) alerts.items.push({ severity: "danger", text: `${openSos} cảnh báo SOS chưa xử lý`, href: "/dispatch" });

  const sentence = composeSentence(
    "Tóm tắt hôm nay: {nm} đơn mới, {dl} đã giao (tỉ lệ thành công {sr}%), {fl} giao thất bại, {busy} xe đang chạy. AI đã tự phân {auto} đơn.{al}",
    {
      nm: createdToday,
      dl: deliveredToday,
      sr: successRate,
      fl: failedToday,
      busy,
      auto: autoCount,
      al: alerts.items.length > 0 ? ` Có ${alerts.items.length} cảnh báo cần chú ý.` : " Không có cảnh báo nghiêm trọng.",
    }
  );

  const cards: ResultCard[] = [kpi];
  if (alerts.items.length > 0) cards.push(alerts);
  return { sentence, cards, confidence: toConfidence(4, { base: 86, seed: "today" }), followUps: ["Đơn nào đang trễ?", "Xe rảnh ở khu vực Bình Dương"] };
}

function handleSuggestDispatch(text: string, data: CopilotData): CopilotResult {
  const code = extractEntities(text).orderCode;
  if (!code) return askForOrder();
  const order = data.orders.find((o) => o.code === code);
  if (!order) return notFound(code);

  const internalIds = new Set(data.carriers.filter((c) => c.type === "INTERNAL").map((c) => c.id));
  const pool = data.vehicles.filter((v) => internalIds.has(v.carrierId));
  const warehouse = data.warehouses.find((w) => w.id === order.warehouseId) ?? null;
  const sugg = suggestVehicles({ order, vehicles: pool, warehouse });

  if (sugg.length === 0) {
    return {
      sentence: composeSentence("Hiện chưa có xe liên kết phù hợp cho {code} ({kg}). Có thể cân nhắc NCC dự phòng.", { code, kg: formatKg(order.weightKg) }),
      cards: [{ kind: "orders", items: [orderItem(order, data)] }],
      confidence: toConfidence(1, { base: 70, seed: code }),
      followUps: [`Trạng thái đơn ${code}`],
    };
  }

  const items: SuggestionItem[] = sugg
    .map((s) => {
      const v = data.vehicles.find((x) => x.id === s.vehicleId);
      if (!v) return null;
      return { vehicleId: s.vehicleId, plate: v.plateNumber, driverName: v.driverName, carrierId: v.carrierId, score: s.score, reasons: s.reasons };
    })
    .filter((x): x is SuggestionItem => x !== null);

  const top = items[0];
  const sentence = composeSentence("Tôi gợi ý {n} xe cho {code} ({kg}, lấy hàng tại {p}). Tốt nhất: {plate} — {sc}/100.", {
    n: items.length,
    code,
    kg: formatKg(order.weightKg),
    p: order.pickup.address,
    plate: top.plate,
    sc: top.score,
  });
  return {
    sentence,
    cards: [{ kind: "suggestion", orderId: order.id, orderCode: order.code, weightKg: order.weightKg, items }],
    confidence: toConfidence(items.length, { base: 80, seed: code }),
    followUps: [`Trạng thái đơn ${code}`, "Tóm tắt hôm nay"],
  };
}

function handleOrderStatus(text: string, data: CopilotData): CopilotResult {
  const code = extractEntities(text).orderCode;
  if (!code) return askForOrder();
  const order = data.orders.find((o) => o.code === code);
  if (!order) return notFound(code);

  const active = order.assignments.find((a) => ["PENDING_ACCEPT", "ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(a.status));
  const v = active ? data.vehicles.find((x) => x.id === active.vehicleId) : null;
  const sentence = composeSentence('{code} ({cn}) đang ở trạng thái "{st}". Tuyến: {from} → {to}, {kg}.{veh}{cod}', {
    code,
    cn: customerName(data, order.customerId),
    st: ORDER_STATUS_LABEL[order.status],
    from: order.pickup.address,
    to: order.dropoff.address,
    kg: formatKg(order.weightKg),
    veh: v ? ` Xe phụ trách: ${v.plateNumber} (${v.driverName}).` : "",
    cod: order.codAmount ? ` Thu hộ ${formatVnd(order.codAmount)} — ${codStatusLabel(order.codStatus)}.` : "",
  });
  const isPending = order.status === "NEW" || order.status === "PENDING_DISPATCH";
  return {
    sentence,
    cards: [
      { kind: "orders", items: [orderItem(order, data)] },
      { kind: "timeline", items: buildTimeline(order) },
    ],
    confidence: toConfidence(3, { base: 85, seed: code }),
    followUps: [isPending ? `Gợi ý điều phối đơn ${code}` : "Tóm tắt hôm nay"],
  };
}

const NAME_STOPWORDS = new Set([
  "cong", "ty", "tnhh", "co", "phan", "thuong", "mai", "san", "xuat", "dich", "vu", "tap", "doan", "viet", "nam",
]);

function findCustomer(norm: string, data: CopilotData): Customer | undefined {
  return data.customers.find((c) => {
    if (norm.includes(normalizeVi(c.code))) return true;
    const tokens = normalizeVi(c.name)
      .split(" ")
      .filter((w) => w.length >= 4 && !NAME_STOPWORDS.has(w));
    return tokens.some((t) => norm.includes(t));
  });
}

function handleCustomerQuota(text: string, data: CopilotData): CopilotResult {
  const norm = normalizeVi(text);
  const cust = findCustomer(norm, data);

  if (!cust) {
    const ranked = data.customers
      .filter((c) => c.quota.type !== "POSTPAID" && c.quota.limit > 0)
      .map((c) => ({ c, r: (c.quota.reserved + c.quota.used) / c.quota.limit }))
      .sort((a, b) => b.r - a.r)
      .slice(0, 5);
    if (ranked.length === 0) return { sentence: "Chưa có dữ liệu hạn mức để hiển thị.", cards: [], confidence: 0, followUps: STATIC_CHIPS };
    const items = ranked.map(({ c, r }) => ({
      severity: (r >= 1 ? "danger" : r >= 0.85 ? "warning" : "info") as "danger" | "warning" | "info",
      text: `${c.name}: đã dùng ${Math.round(r * 100)}% hạn mức`,
      href: `/customers/${c.id}`,
    }));
    return {
      sentence: "Đây là các khách dùng nhiều hạn mức nhất hiện tại:",
      cards: [{ kind: "alerts", items }],
      confidence: toConfidence(3, { base: 80, seed: "quota" }),
      followUps: ["Tóm tắt hôm nay"],
    };
  }

  const q = cust.quota;
  if (q.type === "POSTPAID") {
    const sentence = composeSentence('Khách "{name}" dùng công nợ (POSTPAID). Đang nợ {out}, đã giao tích luỹ {used}.', {
      name: cust.name,
      out: formatKg(q.outstanding ?? 0),
      used: formatKg(q.used),
    });
    return { sentence, cards: [], confidence: toConfidence(2, { base: 82, seed: cust.id }), followUps: ["Tóm tắt hôm nay"] };
  }
  const ratio = q.limit > 0 ? (q.reserved + q.used) / q.limit : 0;
  const pct = Math.round(ratio * 100);
  const sentence = composeSentence('Khách "{name}" ({type}) đã dùng {pct}% hạn mức ({inUse}/{limit}). {tail}', {
    name: cust.name,
    type: q.type === "MONTHLY" ? "theo tháng" : "trả trước",
    pct,
    inUse: formatKg(q.reserved + q.used),
    limit: formatKg(q.limit),
    tail: ratio >= 1 ? "Đã chạm hạn mức — cần nạp thêm." : ratio >= 0.85 ? "Sắp chạm hạn mức." : "Còn dư địa.",
  });
  return {
    sentence,
    cards: [
      {
        kind: "alerts",
        items: [{ severity: ratio >= 1 ? "danger" : ratio >= 0.85 ? "warning" : "info", text: `${cust.name}: ${pct}% hạn mức`, href: `/customers/${cust.id}` }],
      },
    ],
    confidence: toConfidence(3, { base: 84, seed: cust.id }),
    followUps: ["Tóm tắt hôm nay"],
  };
}

function handleFallback(): CopilotResult {
  return {
    sentence:
      'Tôi chuyên về điều phối & vận hành. Bạn thử hỏi: đơn đang trễ, xe rảnh ở một khu vực, lý do một đơn bị trả, gợi ý phân xe, hoặc "tóm tắt hôm nay" nhé.',
    cards: [],
    confidence: 0,
    followUps: STATIC_CHIPS,
  };
}

/** Điểm vào: câu hỏi → kết quả Copilot. */
export function runCopilot(text: string, data: CopilotData): CopilotResult {
  const entities = extractEntities(text);
  const { id } = matchIntent(text, entities);
  switch (id) {
    case "ORDERS_LATE":
      return handleOrdersLate(data);
    case "FLEET_AVAILABLE":
      return handleFleetAvailable(text, data);
    case "WHY_RETURNED":
      return handleWhyReturned(text, data);
    case "TODAY_SUMMARY":
      return handleTodaySummary(data);
    case "SUGGEST_DISPATCH":
      return handleSuggestDispatch(text, data);
    case "ORDER_STATUS":
      return handleOrderStatus(text, data);
    case "CUSTOMER_QUOTA":
      return handleCustomerQuota(text, data);
    default:
      return handleFallback();
  }
}
