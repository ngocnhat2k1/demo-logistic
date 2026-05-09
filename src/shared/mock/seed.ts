import type {
  Carrier,
  Customer,
  Driver,
  Order,
  OrderStatus,
  User,
  Vehicle,
  Quota,
  QuotaType,
  DispatchAssignment,
  AppNotification,
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

function makeName(rng: () => number) {
  return `${pick(rng, FIRST_NAMES)} ${pick(rng, MIDDLE)} ${pick(rng, LAST)}`;
}

function makePhone(rng: () => number) {
  const prefix = pick(rng, ["090", "091", "098", "032", "033", "034", "035", "081", "082", "088"]);
  const tail = String(rangeInt(rng, 1000000, 9999999));
  return `${prefix}${tail}`;
}

function makeQuota(rng: () => number, type: QuotaType): Quota {
  const limit = pick(rng, [5000, 8000, 10000, 15000, 20000, 30000]);
  // Distribute usage to demo states: 0%, 30-50%, 80-95%, 100%
  const usagePool = [0.1, 0.35, 0.5, 0.6, 0.85, 0.92, 0.97, 1.0];
  const used = Math.round(limit * pick(rng, usagePool));
  return {
    type,
    limit,
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

export function buildSeed() {
  const rng = mulberry32(20260509);

  // ---- Carriers ----
  // INTERNAL = nhà xe liên kết (công ty con / liên kết nội bộ)
  // BACKUP   = nhà xe dự phòng (bên thứ 3, thuê ngoài khi cần)
  const carriers: Carrier[] = [
    { id: "carrier_ttm", code: "TTM", name: "Vận tải TTM", type: "INTERNAL", contactPhone: "02838123456" },
    { id: "carrier_vna", code: "VNA", name: "Vận tải VNA", type: "INTERNAL", contactPhone: "02838234567" },
    { id: "carrier_dxp", code: "DXP", name: "Vận tải DXP", type: "INTERNAL", contactPhone: "02838345678" },
    { id: "carrier_bp1", code: "HP", name: "Vận tải Hải Phong", type: "BACKUP", contactPhone: "02838456789" },
    { id: "carrier_bp2", code: "TL", name: "Nhà xe Thiên Long", type: "BACKUP", contactPhone: "02838567890" },
    { id: "carrier_bp3", code: "AN", name: "Vận chuyển An Phát", type: "BACKUP", contactPhone: "02838678901" },
  ];

  const internalCarriers = carriers.filter((c) => c.type === "INTERNAL");
  const backupCarriers = carriers.filter((c) => c.type === "BACKUP");

  // ---- Drivers (18) ----
  // 12 tài xế nhà xe liên kết, 6 tài xế nhà xe dự phòng
  const drivers: Driver[] = [];
  for (let i = 0; i < 18; i++) {
    const carrierId = i < 12 ? pick(rng, internalCarriers).id : pick(rng, backupCarriers).id;
    drivers.push({
      id: `driver_${i + 1}`,
      fullName: makeName(rng),
      phone: makePhone(rng),
      licenseClass: pick(rng, ["B2", "C", "D", "E", "FC"] as const),
      status: "AVAILABLE",
      carrierId,
      routeHistoryCount: rangeInt(rng, 1, 30),
    });
  }

  // ---- Vehicles (25) ----
  // 18 xe liên kết (TTM:8, VNA:6, DXP:4), 7 xe dự phòng (HP:3, TL:2, AN:2)
  const vehicleCarrierMap = [
    ...Array(8).fill("carrier_ttm"),
    ...Array(6).fill("carrier_vna"),
    ...Array(4).fill("carrier_dxp"),
    ...Array(3).fill("carrier_bp1"),
    ...Array(2).fill("carrier_bp2"),
    ...Array(2).fill("carrier_bp3"),
  ];
  const capacities = [1500, 5000, 10000, 14000];
  const vehicles: Vehicle[] = [];
  for (let i = 0; i < 25; i++) {
    const carrierId = vehicleCarrierMap[i];
    const cap = pick(rng, capacities);
    const place = pick(rng, Object.keys(PLACES) as PlaceKey[]);
    const p = PLACES[place];
    const driver = drivers[i % drivers.length];
    vehicles.push({
      id: `vehicle_${i + 1}`,
      plateNumber: `51F-${String(rangeInt(rng, 10000, 99999))}`,
      capacityKg: cap,
      type: pick(rng, VEHICLE_TYPES) as Vehicle["type"],
      carrierId,
      status: "AVAILABLE",
      currentLocation: { lat: p.lat, lng: p.lng },
      currentDriverId: driver.id,
    });
    driver.currentVehicleId = `vehicle_${i + 1}`;
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
    ...Array(8).fill("DISPATCHED"),
    ...Array(5).fill("PICKED_UP"),
    ...Array(8).fill("IN_TRANSIT"),
    ...Array(15).fill("DELIVERED"),
    ...Array(3).fill("DELIVERY_FAILED"),
    ...Array(2).fill("RETURN_PROCESSING"),
    ...Array(1).fill("CANCELLED"),
  ];

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

    if (
      ["DISPATCHED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "DELIVERY_FAILED", "RETURN_PROCESSING"].includes(
        status
      )
    ) {
      const v = vehicles.find((vv) => vv.capacityKg >= weight && vv.status === "AVAILABLE") ?? vehicles[0];
      const d = drivers.find((dd) => dd.id === v.currentDriverId) ?? drivers[0];
      const assignment: DispatchAssignment = {
        id: uid("dasg"),
        orderId: order.id,
        vehicleId: v.id,
        driverId: d.id,
        weightKg: weight,
        assignedAt: createdAt,
        assignedBy: "user_dispatcher",
        status:
          status === "DISPATCHED"
            ? "ASSIGNED"
            : status === "PICKED_UP"
              ? "PICKED_UP"
              : status === "IN_TRANSIT"
                ? "IN_TRANSIT"
                : status === "DELIVERED"
                  ? "DELIVERED"
                  : "FAILED",
      };
      order.assignments = [assignment];

      if (status === "IN_TRANSIT" || status === "PICKED_UP") {
        v.status = "BUSY";
        v.activeAssignmentId = assignment.id;
        v.routePolyline = buildPolyline(order.pickup, order.dropoff, 14);
        v.routeProgress = pick(rng, [0.15, 0.3, 0.45, 0.6, 0.75]);
        d.status = "BUSY";
      }

      if (status === "DELIVERED") {
        order.deliveredAt = new Date(new Date(createdAt).getTime() + 6 * 3600000).toISOString();
        order.pickedUpAt = new Date(new Date(createdAt).getTime() + 1 * 3600000).toISOString();
      }
    }

    orders.push(order);
  }

  // ---- Users ----
  const users: User[] = [
    { id: "user_admin", email: "admin@demo.vn", fullName: "Trần Quản Trị", role: "ADMIN" },
    { id: "user_manager", email: "manager@demo.vn", fullName: "Lê Vận Hành", role: "OPS_MANAGER" },
    { id: "user_dispatcher", email: "dispatcher@demo.vn", fullName: "Nguyễn Anh Tuấn", role: "DISPATCHER" },
    { id: "user_sales", email: "sales@demo.vn", fullName: "Phạm Mai Hương", role: "SALES" },
    {
      id: "user_driver",
      email: "driver@demo.vn",
      fullName: drivers[0].fullName,
      role: "DRIVER",
      driverId: drivers[0].id,
    },
  ];

  // ---- Notifications (a few seed) ----
  const notifications: AppNotification[] = [
    {
      id: uid("notif"),
      type: "QUOTA_WARNING",
      severity: "warning",
      title: "Hạn mức KH gần đầy",
      message: `${customers.find((c) => c.quota.used / c.quota.limit > 0.85)?.name ?? "Khách"} đã dùng >85% hạn mức`,
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

  return { carriers, drivers, vehicles, customers, orders, users, notifications };
}

export type SeedData = ReturnType<typeof buildSeed>;
