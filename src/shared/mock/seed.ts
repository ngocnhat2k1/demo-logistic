import type {
  Carrier,
  Customer,
  Order,
  OrderStatus,
  User,
  Vehicle,
  Quota,
  QuotaType,
  DispatchAssignment,
  AppNotification,
  ReturnReasonConfig,
  OdometerEntry,
  LicenseClass,
} from "@/shared/types";
import { mulberry32, pick, rangeInt, uid } from "@/shared/utils";
import { PLACES, buildPolyline, placeToLocation, type PlaceKey } from "./geo";

const FIRST_NAMES = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Vũ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Hồ",
  "Ngô",
  "Dương",
  "Lý",
];
const MIDDLE = ["Văn", "Thị", "Hữu", "Đức", "Minh", "Quang", "Anh", "Tiến", "Ngọc"];
const LAST = ["An", "Bình", "Cường", "Dũng", "Hùng", "Hải", "Khoa", "Long", "Mai", "Nam", "Phong", "Quân", "Sơn", "Tâm", "Tuấn", "Việt"];

const CUSTOMER_NAMES = [
  "Công ty TNHH Việt Phát",
  "Công ty CP Đại Tín",
  "Công ty TNHH Nam Long",
  "Tập đoàn Hòa Phát",
  "Công ty Sao Việt",
  "Công ty TNHH Minh Anh",
  "Công ty CP Tân Hoàng",
  "Công ty TNHH Phú Mỹ",
  "Công ty Bình Minh",
  "Công ty TNHH Quang Đạt",
  "Công ty CP Vạn Lộc",
  "Công ty TNHH An Khang",
  "Công ty CP Đông Á",
  "Công ty TNHH Nhật Quang",
  "Công ty CP Thiên Phú",
];

const PRODUCT_DESC = [
  "Hàng tiêu dùng đóng gói",
  "Vật liệu xây dựng - xi măng",
  "Linh kiện điện tử",
  "Thực phẩm đông lạnh",
  "Vải may mặc",
  "Nông sản tươi",
  "Hóa chất công nghiệp loại 2",
  "Đồ gỗ nội thất",
  "Thiết bị văn phòng",
  "Phụ tùng cơ khí",
];

const VEHICLE_TYPES = ["BOX", "TANK", "CONTAINER", "FLATBED"] as const;
const LICENSE_CLASSES: LicenseClass[] = ["B2", "C", "D", "E", "FC"];

const DEFAULT_MAINTENANCE_INTERVAL_KM = 10000;

function makeName(rng: () => number) {
  return `${pick(rng, FIRST_NAMES)} ${pick(rng, MIDDLE)} ${pick(rng, LAST)}`;
}

function makePhone(rng: () => number) {
  const prefix = pick(rng, ["090", "091", "098", "032", "033", "034", "035", "081", "082", "088"]);
  const tail = String(rangeInt(rng, 1000000, 9999999));
  return `${prefix}${tail}`;
}

function makeQuota(rng: () => number, type: QuotaType): Quota {
  if (type === "POSTPAID") {
    const outstanding = Math.round(pick(rng, [0, 5000, 12000, 25000, 40000]));
    return {
      type,
      limit: 0,
      reserved: 0,
      used: outstanding,
      outstanding,
      resetCycle: "NEVER",
      history: [
        {
          id: uid("qt"),
          type: "CONSUME",
          amount: outstanding,
          reason: "Tích lũy đã giao (chưa thanh toán)",
          actorId: "system",
          createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        },
      ],
    };
  }
  const limit = pick(rng, [5000, 8000, 10000, 15000, 20000, 30000]);
  const usagePool = [0.1, 0.35, 0.5, 0.6, 0.85, 0.92, 0.97, 1.0];
  const used = Math.round(limit * pick(rng, usagePool));
  return {
    type,
    limit,
    reserved: 0,
    used,
    resetCycle: type === "MONTHLY" ? "MONTHLY" : "NEVER",
    lastResetAt: type === "MONTHLY" ? new Date().toISOString() : undefined,
    history: [
      {
        id: uid("qt"),
        type: "TOPUP",
        amount: limit,
        reason: "Khởi tạo hạn mức",
        actorId: "system",
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      ...(used > 0
        ? [
            {
              id: uid("qt"),
              type: "CONSUME" as const,
              amount: used,
              reason: "Tổng tiêu thụ tích lũy",
              actorId: "system",
              createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
            },
          ]
        : []),
    ],
  };
}

const DEFAULT_RETURN_REASONS: ReturnReasonConfig[] = [
  { id: "rr_customer_rejected", code: "CUSTOMER_REJECTED", label: "Khách từ chối nhận hàng", category: "CUSTOMER_FAULT", refundPercent: 0, active: true, isBuiltIn: true },
  { id: "rr_no_contact", code: "NO_CONTACT", label: "Giao không thành công (không liên lạc được)", category: "CUSTOMER_FAULT", refundPercent: 50, active: true, isBuiltIn: true },
  { id: "rr_wrong_address", code: "WRONG_ADDRESS", label: "Sai địa chỉ giao", category: "CUSTOMER_FAULT", refundPercent: 0, active: true, isBuiltIn: true },
  { id: "rr_damaged_goods", code: "DAMAGED_GOODS", label: "Hàng hóa hư hỏng", category: "FORCE_MAJEURE", refundPercent: 100, active: true, isBuiltIn: true },
  { id: "rr_customer_request", code: "CUSTOMER_REQUEST", label: "Yêu cầu trả hàng từ khách / kinh doanh", category: "CUSTOMER_FAULT", refundPercent: 0, active: true, isBuiltIn: true },
  { id: "rr_vehicle_breakdown", code: "VEHICLE_BREAKDOWN", label: "Xe gặp sự cố phải hoàn hàng về kho", category: "FORCE_MAJEURE", refundPercent: 100, active: true, isBuiltIn: true },
];

function makeOdometerHistory(
  rng: () => number,
  currentKm: number,
  startKm: number,
  entries: number
): OdometerEntry[] {
  if (entries <= 0 || currentKm <= startKm) return [];
  const step = (currentKm - startKm) / entries;
  const out: OdometerEntry[] = [];
  let prev = startKm;
  for (let i = 0; i < entries; i++) {
    const jitter = step * (0.6 + rng() * 0.8);
    const km = Math.min(currentKm, Math.round(prev + jitter));
    out.push({
      id: uid("odo"),
      km,
      addedKm: km - prev,
      recordedAt: new Date(Date.now() - (entries - i) * 86400000).toISOString(),
      recordedBy: "system",
      note: "Tài xế cập nhật sau chuyến (seed)",
    });
    prev = km;
  }
  out[out.length - 1].km = currentKm;
  out[out.length - 1].addedKm = currentKm - (entries > 1 ? out[out.length - 2].km : startKm);
  return out.reverse();
}

export function buildSeed() {
  const rng = mulberry32(20260509);

  // ---- Carriers ----
  const carriers: Carrier[] = [
    { id: "carrier_ttm", code: "TTM", name: "Vận tải TTM", type: "INTERNAL", contactPhone: "02838123456" },
    { id: "carrier_vna", code: "VNA", name: "Vận tải VNA", type: "INTERNAL", contactPhone: "02838234567" },
    { id: "carrier_dxp", code: "DXP", name: "Vận tải DXP", type: "INTERNAL", contactPhone: "02838345678" },
    { id: "carrier_bp1", code: "HP", name: "Vận tải Hải Phong", type: "BACKUP", contactPhone: "02838456789" },
    { id: "carrier_bp2", code: "TL", name: "Nhà xe Thiên Long", type: "BACKUP", contactPhone: "02838567890" },
    { id: "carrier_bp3", code: "AN", name: "Vận chuyển An Phát", type: "BACKUP", contactPhone: "02838678901" },
  ];

  // ---- Vehicles (22, each with embedded driver — 1 vehicle = 1 driver) ----
  const vehicleCarrierMap = [
    ...Array(7).fill("carrier_ttm"),
    ...Array(5).fill("carrier_vna"),
    ...Array(4).fill("carrier_dxp"),
    ...Array(3).fill("carrier_bp1"),
    ...Array(2).fill("carrier_bp2"),
    ...Array(1).fill("carrier_bp3"),
  ];
  const capacities = [1500, 5000, 10000, 14000];
  const vehicles: Vehicle[] = [];
  for (let i = 0; i < vehicleCarrierMap.length; i++) {
    const carrierId = vehicleCarrierMap[i];
    const cap = pick(rng, capacities);
    const place = pick(rng, Object.keys(PLACES) as PlaceKey[]);
    const p = PLACES[place];
    // Distribute odometer to show all maintenance states:
    //   - some fresh (<5000 since maintenance)
    //   - some approaching maintenance (8000-9500)
    //   - some overdue (>10000)
    const sinceMaint = pick(rng, [
      rangeInt(rng, 500, 4500),
      rangeInt(rng, 4500, 8000),
      rangeInt(rng, 8500, 9800),
      rangeInt(rng, 10000, 12500),
    ]);
    const lastMaint = rangeInt(rng, 30000, 120000);
    const odometerKm = lastMaint + sinceMaint;
    vehicles.push({
      id: `vehicle_${i + 1}`,
      plateNumber: `51F-${String(rangeInt(rng, 10000, 99999))}`,
      capacityKg: cap,
      type: pick(rng, VEHICLE_TYPES) as Vehicle["type"],
      carrierId,
      status: "AVAILABLE",
      currentLocation: { lat: p.lat, lng: p.lng },
      driverName: makeName(rng),
      driverPhone: makePhone(rng),
      driverLicenseClass: pick(rng, LICENSE_CLASSES),
      routeHistoryCount: rangeInt(rng, 1, 30),
      odometerKm,
      lastMaintenanceOdometerKm: lastMaint,
      maintenanceIntervalKm: DEFAULT_MAINTENANCE_INTERVAL_KM,
      odometerHistory: makeOdometerHistory(rng, odometerKm, lastMaint, rangeInt(rng, 3, 6)),
    });
  }

  // ---- Customers (15) ----
  const customers: Customer[] = [];
  const quotaTypes: QuotaType[] = ["POSTPAID", "MONTHLY", "PREPAID"];
  for (let i = 0; i < 15; i++) {
    const type = quotaTypes[i % 3];
    customers.push({
      id: `customer_${i + 1}`,
      code: `KH-${String(i + 1).padStart(3, "0")}`,
      name: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length],
      taxCode: String(rangeInt(rng, 100000000, 999999999)),
      phone: makePhone(rng),
      email: `kh${i + 1}@${pick(rng, ["vp", "dt", "nl", "hp", "sv"])}.vn`,
      address: pick(rng, Object.values(PLACES)).name,
      quota: makeQuota(rng, type),
      source: pick(rng, ["MANUAL", "CYBER", "IMPORT"] as const),
      createdAt: new Date(Date.now() - rangeInt(rng, 30, 365) * 86400000).toISOString(),
    });
  }

  // ---- Orders (60) ----
  const orders: Order[] = [];
  const statusDistribution: OrderStatus[] = [
    ...Array(10).fill("NEW"),
    ...Array(8).fill("PENDING_DISPATCH"),
    ...Array(3).fill("PENDING_ACCEPT"),
    ...Array(5).fill("DISPATCHED"),
    ...Array(4).fill("PICKED_UP"),
    ...Array(6).fill("IN_TRANSIT"),
    ...Array(15).fill("DELIVERED"),
    ...Array(3).fill("DELIVERY_FAILED"),
    ...Array(2).fill("RETURN_PROCESSING"),
    ...Array(1).fill("CANCELLED"),
  ];
  // Track per-vehicle inflight allocation to honour the "1 active + 1 pending" rule.
  const vehicleActive: Record<string, number> = {};
  const vehiclePending: Record<string, number> = {};

  const placeKeys = Object.keys(PLACES) as PlaceKey[];

  for (let i = 0; i < 60; i++) {
    const status = statusDistribution[i % statusDistribution.length];
    const customer = pick(rng, customers);
    const pickupKey = pick(rng, placeKeys);
    let dropoffKey = pick(rng, placeKeys);
    while (dropoffKey === pickupKey) dropoffKey = pick(rng, placeKeys);
    const weight = pick(rng, [200, 500, 800, 1200, 2000, 3500, 5000, 8000]);
    const createdAt = new Date(Date.now() - rangeInt(rng, 0, 7) * 86400000 - rangeInt(rng, 0, 23) * 3600000).toISOString();
    const requested = new Date(new Date(createdAt).getTime() + rangeInt(rng, 6, 72) * 3600000).toISOString();

    const order: Order = {
      id: `order_${i + 1}`,
      code: `DH-${String(i + 1).padStart(4, "0")}`,
      customerId: customer.id,
      status,
      pickup: placeToLocation(pickupKey, "Người gửi", makePhone(rng)),
      dropoff: placeToLocation(dropoffKey, "Người nhận", makePhone(rng)),
      weightKg: weight,
      description: pick(rng, PRODUCT_DESC),
      requestedDeliveryAt: requested,
      assignments: [],
      source: pick(rng, ["MANUAL", "CYBER", "IMPORT"] as const),
      events: [
        {
          id: uid("evt"),
          type: "CREATED",
          payload: { status: "NEW" },
          actorId: "system",
          at: createdAt,
        },
      ],
      createdAt,
      updatedAt: createdAt,
    };

    const isActive = status === "DISPATCHED" || status === "PICKED_UP" || status === "IN_TRANSIT";
    const isPending = status === "PENDING_ACCEPT";
    const isTerminalWithAssignment =
      status === "DELIVERED" || status === "DELIVERY_FAILED" || status === "RETURN_PROCESSING";

    if (isActive || isPending || isTerminalWithAssignment) {
      // For active/pending we must respect the 1-active + 1-pending per vehicle rule.
      const v = isTerminalWithAssignment
        ? vehicles.find((vv) => vv.capacityKg >= weight) ?? vehicles[0]
        : vehicles.find(
            (vv) =>
              vv.capacityKg >= weight &&
              (vehicleActive[vv.id] ?? 0) < (isActive ? 1 : 2) &&
              (vehiclePending[vv.id] ?? 0) < (isPending ? 1 : 2) &&
              (vehicleActive[vv.id] ?? 0) + (vehiclePending[vv.id] ?? 0) < 2
          );
      if (!v) {
        // No vehicle has room — downgrade to PENDING_DISPATCH (unassigned).
        order.status = "PENDING_DISPATCH";
        orders.push(order);
        continue;
      }

      const assignment: DispatchAssignment = {
        id: uid("dasg"),
        orderId: order.id,
        vehicleId: v.id,
        weightKg: weight,
        assignedAt: createdAt,
        assignedBy: "user_dispatcher",
        status:
          status === "PENDING_ACCEPT"
            ? "PENDING_ACCEPT"
            : status === "DISPATCHED"
              ? "ASSIGNED"
              : status === "PICKED_UP"
                ? "PICKED_UP"
                : status === "IN_TRANSIT"
                  ? "IN_TRANSIT"
                  : status === "DELIVERED"
                    ? "DELIVERED"
                    : "FAILED",
      };
      if (status === "DISPATCHED" || status === "PICKED_UP" || status === "IN_TRANSIT") {
        assignment.acceptedAt = createdAt;
      }
      order.assignments = [assignment];

      if (isActive) {
        v.status = "BUSY";
        v.activeAssignmentId = assignment.id;
        v.routePolyline = buildPolyline(order.pickup, order.dropoff, 14);
        v.routeProgress =
          status === "DISPATCHED" ? 0 : pick(rng, [0.15, 0.3, 0.45, 0.6, 0.75]);
        vehicleActive[v.id] = (vehicleActive[v.id] ?? 0) + 1;
      } else if (isPending) {
        // PENDING_ACCEPT marks the vehicle BUSY but no active route yet.
        v.status = "BUSY";
        vehiclePending[v.id] = (vehiclePending[v.id] ?? 0) + 1;
      }

      if (status === "DELIVERED") {
        order.deliveredAt = new Date(new Date(createdAt).getTime() + 6 * 3600000).toISOString();
        order.pickedUpAt = new Date(new Date(createdAt).getTime() + 1 * 3600000).toISOString();
      }
    }

    orders.push(order);
  }

  const inflightStatuses: OrderStatus[] = [
    "NEW",
    "PENDING_DISPATCH",
    "PENDING_ACCEPT",
    "DISPATCHED",
    "PICKED_UP",
    "IN_TRANSIT",
  ];
  for (const o of orders) {
    if (!inflightStatuses.includes(o.status)) continue;
    const c = customers.find((cc) => cc.id === o.customerId);
    if (!c) continue;
    c.quota.reserved += o.weightKg;
  }

  // ---- Users ----
  const driverVehicle = vehicles[0];
  const users: User[] = [
    { id: "user_admin", email: "admin@demo.vn", fullName: "Trần Quản Trị", role: "ADMIN" },
    { id: "user_manager", email: "manager@demo.vn", fullName: "Lê Vận Hành", role: "OPS_MANAGER" },
    { id: "user_dispatcher", email: "dispatcher@demo.vn", fullName: "Nguyễn Anh Tuấn", role: "DISPATCHER" },
    { id: "user_sales", email: "sales@demo.vn", fullName: "Phạm Mai Hương", role: "SALES" },
    {
      id: "user_customer",
      email: customers[0]?.email ?? "customer@demo.vn",
      fullName: customers[0]?.name ?? "Khách hàng Demo",
      role: "CUSTOMER",
      customerId: customers[0]?.id,
    },
    {
      id: "user_driver",
      email: "driver@demo.vn",
      fullName: driverVehicle.driverName,
      role: "DRIVER",
      vehicleId: driverVehicle.id,
    },
  ];

  // ---- Notifications ----
  const notifications: AppNotification[] = [
    {
      id: uid("notif"),
      type: "QUOTA_WARNING",
      severity: "warning",
      title: "Hạn mức KH gần đầy",
      message: `${customers.find((c) => c.quota.type !== "POSTPAID" && c.quota.limit > 0 && (c.quota.used + (c.quota.reserved ?? 0)) / c.quota.limit > 0.85)?.name ?? "Khách"} đã dùng >85% hạn mức`,
      targetRoles: ["DISPATCHER", "SALES", "OPS_MANAGER"],
      read: false,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: uid("notif"),
      type: "ORDER_DELIVERED",
      severity: "success",
      title: "Đơn đã giao thành công",
      message: "DH-0015 giao thành công lúc 14:25",
      targetRoles: ["DISPATCHER", "OPS_MANAGER"],
      read: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  return { carriers, vehicles, customers, orders, users, notifications, returnReasons: DEFAULT_RETURN_REASONS };
}

export type SeedData = ReturnType<typeof buildSeed>;
