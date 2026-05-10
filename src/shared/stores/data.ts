"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/shared/db/persist";
import type {
  Carrier,
  Customer,
  Driver,
  Order,
  ReturnOrder,
  Vehicle,
  User,
  AppNotification,
  MockMessage,
  SosAlert,
  CyberSyncEntry,
  OrderStatus,
  DispatchAssignment,
  Quota,
  QuotaTransaction,
  ReturnReasonConfig,
  Location,
  QuotaOverrideRecord,
  UserRole,
} from "@/shared/types";
import { buildSeed } from "@/shared/mock/seed";
import { uid } from "@/shared/utils";
import { buildPolyline } from "@/shared/mock/geo";

interface DataState {
  customers: Customer[];
  vehicles: Vehicle[];
  drivers: Driver[];
  carriers: Carrier[];
  orders: Order[];
  returns: ReturnOrder[];
  users: User[];
  notifications: AppNotification[];
  messages: MockMessage[];
  sos: SosAlert[];
  cyberLog: CyberSyncEntry[];
  returnReasons: ReturnReasonConfig[];
  _hasHydrated: boolean;
  setHydrated: () => void;

  // bootstrap
  ensureSeeded: () => void;
  resetAll: () => void;

  // customer
  addCustomer: (input: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    taxCode?: string;
    quotaType: import("@/shared/types").QuotaType;
    quotaLimitKg: number; // ignored for POSTPAID
  }) => Customer;
  updateCustomer: (
    id: string,
    input: {
      name: string;
      phone: string;
      email?: string;
      address: string;
      taxCode?: string;
      quotaType: import("@/shared/types").QuotaType;
      quotaLimitKg: number;
    },
    actorId: string
  ) => void;

  // customer / quota
  reserveQuota: (customerId: string, kg: number, orderId: string, actorId: string) => void;
  releaseQuota: (customerId: string, kg: number, orderId: string, actorId: string, reason: string) => void;
  consumeReservedQuota: (customerId: string, kg: number, orderId: string, actorId: string) => void;
  recordPayment: (customerId: string, kg: number, actorId: string, note?: string) => void;
  topUpQuota: (customerId: string, kg: number, actorId: string, note?: string) => void;
  resetMonthlyQuota: (customerId: string) => void;
  autoResetMonthlyIfDue: () => void;

  // return reasons config
  addReturnReason: (input: Omit<ReturnReasonConfig, "id" | "isBuiltIn">) => void;
  updateReturnReason: (id: string, patch: Partial<Omit<ReturnReasonConfig, "id" | "isBuiltIn" | "code">>) => void;
  toggleReturnReason: (id: string) => void;
  deleteReturnReason: (id: string) => void;

  // orders
  createOrder: (
    input: Omit<Order, "id" | "code" | "status" | "events" | "assignments" | "createdAt" | "updatedAt"> & { status?: OrderStatus }
  ) => Order;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  /** Điều độ cập nhật thông tin đơn. Có log sự kiện. Khi đổi địa điểm/khối lượng và đơn đã phân xe → tự bỏ phân xe để re-dispatch. Khi đổi khối lượng → re-check & điều chỉnh hạn mức. */
  updateOrderInfo: (
    id: string,
    patch: {
      notes?: string;
      requestedDeliveryAt?: string;
      description?: string;
      extraCostNote?: string;
      pickup?: Location;
      dropoff?: Location;
      weightKg?: number;
    },
    actorId: string
  ) => void;
  /** Ghi nhận trọng lượng thực tế khi điều độ tiếp nhận đơn. Tự điều chỉnh phần hạn mức đã giữ chỗ và log sự kiện. */
  adjustOrderWeight: (orderId: string, actualKg: number, actorId: string, extraCostNote?: string) => void;
  /** Ghi nhận override hạn mức (cần phân quyền cao). Lưu vào order.quotaOverrides + log sự kiện + push notification. */
  applyQuotaOverride: (
    orderId: string,
    actorId: string,
    actorName: string,
    role: UserRole,
    reason: string
  ) => void;
  cancelOrder: (id: string, actorId: string) => void;
  setOrderStatus: (id: string, status: OrderStatus, actorId: string, payload?: Record<string, unknown>) => void;
  assignOrderToVehicle: (orderId: string, vehicleId: string, actorId: string, weightKg?: number, partLabel?: string) => DispatchAssignment | null;
  unassignOrder: (orderId: string, assignmentId: string, actorId: string) => void;
  splitOrder: (orderId: string, parts: number[]) => string[]; // returns new order ids
  reportDeliveryFailure: (orderId: string, reasonId: string, notes: string, photos: string[], actorId: string) => void;
  completeDelivery: (orderId: string, signature: string | undefined, photos: string[], actorId: string) => void;

  // vehicles
  setVehicleStatus: (vehicleId: string, status: Vehicle["status"]) => void;
  setVehicleLocation: (vehicleId: string, lat: number, lng: number, progress?: number) => void;

  // drivers
  setDriverStatus: (driverId: string, status: Driver["status"]) => void;

  // notifications
  pushNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;

  // mock messages
  pushMessage: (m: Omit<MockMessage, "id" | "createdAt">) => void;

  // sos
  raiseSos: (driverId: string, vehicleId: string, location: { lat: number; lng: number }, orderIds: string[], message?: string) => SosAlert;
  resolveSos: (id: string) => void;

  // cyber
  addCyberLog: (entry: Omit<CyberSyncEntry, "id" | "at">) => void;
  importCyberOrders: (count: number) => Order[];
}

const empty = {
  customers: [],
  vehicles: [],
  drivers: [],
  carriers: [],
  orders: [],
  returns: [],
  users: [],
  notifications: [],
  messages: [],
  sos: [],
  cyberLog: [],
  returnReasons: [],
};

function nowIso() {
  return new Date().toISOString();
}

const PRODUCTS = [
  "Hàng tiêu dùng",
  "Vật liệu xây dựng",
  "Linh kiện điện tử",
  "Thực phẩm khô",
  "Vải sợi",
];

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      ...empty,
      _hasHydrated: false,
      setHydrated: () => set({ _hasHydrated: true }),

      ensureSeeded: () => {
        const s = get();
        if (s.customers.length > 0 || s.orders.length > 0) return;
        const seed = buildSeed();
        set({ ...empty, ...seed });
      },

      resetAll: () => {
        const seed = buildSeed();
        set({ ...empty, ...seed });
      },

      addCustomer: (input) => {
        const customers = get().customers;
        const code = `KH-${String(customers.length + 1).padStart(3, "0")}`;
        const now = nowIso();
        const isPostpaid = input.quotaType === "POSTPAID";
        const quota: Quota = {
          type: input.quotaType,
          limit: isPostpaid ? 0 : input.quotaLimitKg,
          reserved: 0,
          used: 0,
          outstanding: isPostpaid ? 0 : undefined,
          resetCycle: input.quotaType === "MONTHLY" ? "MONTHLY" : "NEVER",
          lastResetAt: input.quotaType === "MONTHLY" ? now : undefined,
          history: isPostpaid
            ? []
            : [
                {
                  id: uid("qt"),
                  type: "TOPUP",
                  amount: input.quotaLimitKg,
                  reason: "Khởi tạo hạn mức",
                  actorId: "system",
                  createdAt: now,
                },
              ],
        };
        const c: Customer = {
          id: uid("customer"),
          code,
          name: input.name,
          phone: input.phone,
          email: input.email,
          address: input.address,
          taxCode: input.taxCode,
          quota,
          source: "MANUAL",
          createdAt: now,
        };
        set({ customers: [c, ...customers] });
        return c;
      },

      updateCustomer: (id, input, actorId) => {
        const c = get().customers.find((x) => x.id === id);
        if (!c) return;
        const now = nowIso();
        const oldType = c.quota.type;
        const newType = input.quotaType;
        const isPostpaidNew = newType === "POSTPAID";
        let quota: Quota = {
          ...c.quota,
          type: newType,
          resetCycle: newType === "MONTHLY" ? "MONTHLY" : "NEVER",
        };

        if (oldType !== newType) {
          // Reset balances when switching quota type — keep history
          quota = {
            ...quota,
            limit: isPostpaidNew ? 0 : input.quotaLimitKg,
            reserved: 0,
            used: 0,
            outstanding: isPostpaidNew ? 0 : undefined,
            lastResetAt: newType === "MONTHLY" ? now : c.quota.lastResetAt,
            history: [
              ...c.quota.history,
              {
                id: uid("qt"),
                type: "RESET",
                amount: 0,
                reason: `Đổi loại hạn mức: ${oldType} → ${newType}`,
                actorId,
                createdAt: now,
              },
              ...(!isPostpaidNew && input.quotaLimitKg > 0
                ? [
                    {
                      id: uid("qt"),
                      type: "TOPUP" as const,
                      amount: input.quotaLimitKg,
                      reason: `Khởi tạo hạn mức (${newType})`,
                      actorId,
                      createdAt: now,
                    },
                  ]
                : []),
            ],
          };
        } else if (!isPostpaidNew && input.quotaLimitKg !== c.quota.limit) {
          const delta = input.quotaLimitKg - c.quota.limit;
          quota = {
            ...quota,
            limit: input.quotaLimitKg,
            history: [
              ...c.quota.history,
              {
                id: uid("qt"),
                type: delta > 0 ? "TOPUP" : "RESET",
                amount: Math.abs(delta),
                reason:
                  delta > 0
                    ? `Tăng hạn mức ${delta} kg`
                    : `Giảm hạn mức ${Math.abs(delta)} kg`,
                actorId,
                createdAt: now,
              },
            ],
          };
        }

        set({
          customers: get().customers.map((x) =>
            x.id === id
              ? {
                  ...x,
                  name: input.name,
                  phone: input.phone,
                  email: input.email,
                  address: input.address,
                  taxCode: input.taxCode,
                  quota,
                }
              : x
          ),
        });
      },

      reserveQuota: (customerId, kg, orderId, actorId) => {
        const c = get().customers.find((x) => x.id === customerId);
        if (!c) return;
        const tx: QuotaTransaction = {
          id: uid("qt"),
          type: "RESERVE",
          amount: kg,
          orderId,
          reason: "Tạo đơn — giữ chỗ hạn mức",
          actorId,
          createdAt: nowIso(),
        };
        const updated: Quota = {
          ...c.quota,
          reserved: (c.quota.reserved ?? 0) + kg,
          history: [...c.quota.history, tx],
        };
        set({
          customers: get().customers.map((x) => (x.id === customerId ? { ...x, quota: updated } : x)),
        });
      },

      releaseQuota: (customerId, kg, orderId, actorId, reason) => {
        const c = get().customers.find((x) => x.id === customerId);
        if (!c) return;
        const tx: QuotaTransaction = {
          id: uid("qt"),
          type: "RELEASE",
          amount: kg,
          orderId,
          reason,
          actorId,
          createdAt: nowIso(),
        };
        const updated: Quota = {
          ...c.quota,
          reserved: Math.max(0, (c.quota.reserved ?? 0) - kg),
          history: [...c.quota.history, tx],
        };
        set({
          customers: get().customers.map((x) => (x.id === customerId ? { ...x, quota: updated } : x)),
        });
      },

      consumeReservedQuota: (customerId, kg, orderId, actorId) => {
        const c = get().customers.find((x) => x.id === customerId);
        if (!c) return;
        const tx: QuotaTransaction = {
          id: uid("qt"),
          type: "CONSUME",
          amount: kg,
          orderId,
          reason: "Đã giao đơn",
          actorId,
          createdAt: nowIso(),
        };
        const updated: Quota = {
          ...c.quota,
          reserved: Math.max(0, (c.quota.reserved ?? 0) - kg),
          used: c.quota.used + kg,
          outstanding:
            c.quota.type === "POSTPAID" ? (c.quota.outstanding ?? 0) + kg : c.quota.outstanding,
          history: [...c.quota.history, tx],
        };
        set({
          customers: get().customers.map((x) => (x.id === customerId ? { ...x, quota: updated } : x)),
        });
      },

      recordPayment: (customerId, kg, actorId, note) => {
        const c = get().customers.find((x) => x.id === customerId);
        if (!c || c.quota.type !== "POSTPAID") return;
        const tx: QuotaTransaction = {
          id: uid("qt"),
          type: "PAYMENT",
          amount: kg,
          reason: note ?? "Ghi nhận thanh toán",
          actorId,
          createdAt: nowIso(),
        };
        const updated: Quota = {
          ...c.quota,
          outstanding: Math.max(0, (c.quota.outstanding ?? 0) - kg),
          history: [...c.quota.history, tx],
        };
        set({
          customers: get().customers.map((x) => (x.id === customerId ? { ...x, quota: updated } : x)),
        });
      },

      topUpQuota: (customerId, kg, actorId, note) => {
        const c = get().customers.find((x) => x.id === customerId);
        if (!c) return;
        const tx: QuotaTransaction = {
          id: uid("qt"),
          type: "TOPUP",
          amount: kg,
          reason: note ?? "Nạp thêm hạn mức",
          actorId,
          createdAt: nowIso(),
        };
        const updated: Quota = {
          ...c.quota,
          limit: c.quota.limit + kg,
          history: [...c.quota.history, tx],
        };
        set({
          customers: get().customers.map((x) => (x.id === customerId ? { ...x, quota: updated } : x)),
        });
      },

      resetMonthlyQuota: (customerId) => {
        const c = get().customers.find((x) => x.id === customerId);
        if (!c || c.quota.type !== "MONTHLY") return;
        const tx: QuotaTransaction = {
          id: uid("qt"),
          type: "RESET",
          amount: c.quota.used,
          reason: "Reset đầu tháng",
          actorId: "system",
          createdAt: nowIso(),
        };
        const updated: Quota = {
          ...c.quota,
          used: 0,
          lastResetAt: nowIso(),
          history: [...c.quota.history, tx],
        };
        set({
          customers: get().customers.map((x) => (x.id === customerId ? { ...x, quota: updated } : x)),
        });
      },

      autoResetMonthlyIfDue: () => {
        const now = new Date();
        const ym = `${now.getFullYear()}-${now.getMonth()}`;
        const customers = get().customers;
        let changed = false;
        const updatedCustomers = customers.map((c) => {
          if (c.quota.type !== "MONTHLY") return c;
          const last = c.quota.lastResetAt ? new Date(c.quota.lastResetAt) : null;
          const lastYm = last ? `${last.getFullYear()}-${last.getMonth()}` : null;
          if (lastYm === ym) return c;
          changed = true;
          const tx: QuotaTransaction = {
            id: uid("qt"),
            type: "RESET",
            amount: c.quota.used,
            reason: "Reset tự động đầu tháng",
            actorId: "system",
            createdAt: nowIso(),
          };
          return {
            ...c,
            quota: { ...c.quota, used: 0, lastResetAt: nowIso(), history: [...c.quota.history, tx] },
          };
        });
        if (changed) set({ customers: updatedCustomers });
      },

      addReturnReason: (input) => {
        const item: ReturnReasonConfig = {
          ...input,
          id: uid("rr"),
          isBuiltIn: false,
        };
        set({ returnReasons: [...get().returnReasons, item] });
      },

      updateReturnReason: (id, patch) => {
        set({
          returnReasons: get().returnReasons.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        });
      },

      toggleReturnReason: (id) => {
        set({
          returnReasons: get().returnReasons.map((r) =>
            r.id === id ? { ...r, active: !r.active } : r
          ),
        });
      },

      deleteReturnReason: (id) => {
        const r = get().returnReasons.find((x) => x.id === id);
        if (!r || r.isBuiltIn) return;
        set({ returnReasons: get().returnReasons.filter((x) => x.id !== id) });
      },

      createOrder: (input) => {
        const orders = get().orders;
        const code = `DH-${String(orders.length + 1).padStart(4, "0")}`;
        const now = nowIso();
        const order: Order = {
          id: uid("order"),
          code,
          customerId: input.customerId,
          status: input.status ?? "NEW",
          pickup: input.pickup,
          dropoff: input.dropoff,
          weightKg: input.weightKg,
          description: input.description,
          notes: input.notes,
          requestedDeliveryAt: input.requestedDeliveryAt,
          assignments: [],
          source: input.source,
          externalId: input.externalId,
          events: [
            {
              id: uid("evt"),
              type: "CREATED",
              payload: { source: input.source },
              actorId: "user",
              at: now,
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
        set({ orders: [order, ...orders] });
        // reserve quota immediately upon creation
        get().reserveQuota(input.customerId, input.weightKg, order.id, "user");
        return order;
      },

      updateOrder: (id, patch) => {
        set({
          orders: get().orders.map((o) =>
            o.id === id ? { ...o, ...patch, updatedAt: nowIso() } : o
          ),
        });
      },

      updateOrderInfo: (id, patch, actorId) => {
        const o = get().orders.find((x) => x.id === id);
        if (!o) return;
        const now = nowIso();
        const changed: Record<string, { from: unknown; to: unknown }> = {};
        if (patch.notes !== undefined && patch.notes !== o.notes) {
          changed.notes = { from: o.notes ?? "", to: patch.notes };
        }
        if (
          patch.requestedDeliveryAt !== undefined &&
          patch.requestedDeliveryAt !== o.requestedDeliveryAt
        ) {
          changed.requestedDeliveryAt = { from: o.requestedDeliveryAt, to: patch.requestedDeliveryAt };
        }
        if (patch.description !== undefined && patch.description !== o.description) {
          changed.description = { from: o.description, to: patch.description };
        }
        if (patch.extraCostNote !== undefined && patch.extraCostNote !== o.extraCostNote) {
          changed.extraCostNote = { from: o.extraCostNote ?? "", to: patch.extraCostNote };
        }
        const pickupChanged =
          patch.pickup !== undefined &&
          (patch.pickup.address !== o.pickup.address ||
            patch.pickup.lat !== o.pickup.lat ||
            patch.pickup.lng !== o.pickup.lng);
        const dropoffChanged =
          patch.dropoff !== undefined &&
          (patch.dropoff.address !== o.dropoff.address ||
            patch.dropoff.lat !== o.dropoff.lat ||
            patch.dropoff.lng !== o.dropoff.lng);
        if (pickupChanged) changed.pickup = { from: o.pickup.address, to: patch.pickup!.address };
        if (dropoffChanged) changed.dropoff = { from: o.dropoff.address, to: patch.dropoff!.address };

        // Weight change → re-check & adjust quota reservation while still pre-delivery
        const releasable: OrderStatus[] = ["NEW", "PENDING_DISPATCH", "DISPATCHED"];
        const weightChanged =
          patch.weightKg !== undefined &&
          Number.isFinite(patch.weightKg) &&
          patch.weightKg > 0 &&
          Math.abs(patch.weightKg - o.weightKg) > 0.0001;
        if (weightChanged) {
          const diff = patch.weightKg! - o.weightKg;
          changed.weightKg = { from: o.weightKg, to: patch.weightKg };
          if (releasable.includes(o.status)) {
            if (diff > 0) {
              get().reserveQuota(o.customerId, diff, o.id, actorId);
            } else {
              get().releaseQuota(
                o.customerId,
                Math.abs(diff),
                o.id,
                actorId,
                "Cập nhật khối lượng đơn (giảm) — hoàn hạn mức"
              );
            }
          }
        }

        if (Object.keys(changed).length === 0) return;

        // If pickup/dropoff/weight changed and order has assignments → free vehicles for re-dispatch
        const needsReDispatch =
          (pickupChanged || dropoffChanged || weightChanged) && o.assignments.length > 0;
        if (needsReDispatch) {
          o.assignments.forEach((a) => {
            get().unassignOrder(o.id, a.id, actorId);
          });
        }

        set({
          orders: get().orders.map((x) =>
            x.id === id
              ? {
                  ...x,
                  notes: patch.notes ?? x.notes,
                  requestedDeliveryAt: patch.requestedDeliveryAt ?? x.requestedDeliveryAt,
                  description: patch.description ?? x.description,
                  extraCostNote: patch.extraCostNote ?? x.extraCostNote,
                  pickup: patch.pickup ?? x.pickup,
                  dropoff: patch.dropoff ?? x.dropoff,
                  weightKg: weightChanged ? patch.weightKg! : x.weightKg,
                  updatedAt: now,
                  events: [
                    ...x.events,
                    {
                      id: uid("evt"),
                      type: "INFO_UPDATED",
                      payload: { changed, reDispatch: needsReDispatch || undefined },
                      actorId,
                      at: now,
                    },
                  ],
                }
              : x
          ),
        });

        if (needsReDispatch) {
          get().pushNotification({
            type: "GENERIC",
            severity: "warning",
            title: "Cần điều phối lại",
            message: `Đơn ${o.code} đã thay đổi địa điểm/khối lượng — đã bỏ phân xe, cần re-dispatch.`,
            targetRoles: ["DISPATCHER", "OPS_MANAGER", "ADMIN"],
          });
        }
      },

      adjustOrderWeight: (orderId, actualKg, actorId, extraCostNote) => {
        const o = get().orders.find((x) => x.id === orderId);
        if (!o) return;
        if (!Number.isFinite(actualKg) || actualKg <= 0) return;
        const oldKg = o.weightKg;
        const diff = actualKg - oldKg;
        const now = nowIso();
        // Adjust reservation only while still pre-delivery (reserved is meaningful)
        const releasable: OrderStatus[] = ["NEW", "PENDING_DISPATCH", "DISPATCHED"];
        if (releasable.includes(o.status) && Math.abs(diff) > 0.0001) {
          if (diff > 0) {
            get().reserveQuota(o.customerId, diff, o.id, actorId);
          } else {
            get().releaseQuota(
              o.customerId,
              Math.abs(diff),
              o.id,
              actorId,
              "Điều chỉnh trọng lượng thực tế (giảm)"
            );
          }
        }
        set({
          orders: get().orders.map((x) =>
            x.id === orderId
              ? {
                  ...x,
                  weightKg: actualKg,
                  actualWeightKg: actualKg,
                  extraCostNote: extraCostNote ?? x.extraCostNote,
                  updatedAt: now,
                  events: [
                    ...x.events,
                    {
                      id: uid("evt"),
                      type: "WEIGHT_ADJUSTED",
                      payload: {
                        declaredKg: oldKg,
                        actualKg,
                        diffKg: diff,
                        extraCostNote: extraCostNote ?? null,
                      },
                      actorId,
                      at: now,
                    },
                  ],
                }
              : x
          ),
        });
      },

      applyQuotaOverride: (orderId, actorId, actorName, role, reason) => {
        const o = get().orders.find((x) => x.id === orderId);
        if (!o) return;
        const customer = get().customers.find((c) => c.id === o.customerId);
        if (!customer) return;
        const now = nowIso();
        const record: QuotaOverrideRecord = {
          actorId,
          actorName,
          role,
          reason,
          at: now,
          customerId: customer.id,
          attemptedKg: o.weightKg,
          quotaSnapshot: {
            reserved: customer.quota.reserved ?? 0,
            used: customer.quota.used,
            limit: customer.quota.limit,
            type: customer.quota.type,
          },
        };
        set({
          orders: get().orders.map((x) =>
            x.id === orderId
              ? {
                  ...x,
                  quotaOverrides: [...(x.quotaOverrides ?? []), record],
                  updatedAt: now,
                  events: [
                    ...x.events,
                    {
                      id: uid("evt"),
                      type: "QUOTA_OVERRIDE",
                      payload: { ...record },
                      actorId,
                      at: now,
                    },
                  ],
                }
              : x
          ),
        });
        get().pushNotification({
          type: "QUOTA_WARNING",
          severity: "warning",
          title: "Override hạn mức",
          message: `${actorName} (${role}) override hạn mức KH ${customer.name} cho đơn ${o.code}: ${reason}`,
          targetRoles: ["ADMIN", "OPS_MANAGER"],
        });
      },

      cancelOrder: (id, actorId) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order) return;
        // refund reserved quota if order had not yet been delivered/failed
        const releasable: OrderStatus[] = [
          "NEW",
          "PENDING_DISPATCH",
          "DISPATCHED",
          "PICKED_UP",
          "IN_TRANSIT",
        ];
        if (releasable.includes(order.status)) {
          get().releaseQuota(order.customerId, order.weightKg, order.id, actorId, "Hủy đơn — hoàn hạn mức");
        }
        // free vehicles
        order.assignments.forEach((a) => {
          const v = get().vehicles.find((x) => x.id === a.vehicleId);
          if (v && v.activeAssignmentId === a.id) {
            set({
              vehicles: get().vehicles.map((x) =>
                x.id === v.id ? { ...x, status: "AVAILABLE", activeAssignmentId: undefined, routePolyline: undefined, routeProgress: undefined } : x
              ),
            });
          }
        });
        set({
          orders: get().orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status: "CANCELLED",
                  updatedAt: nowIso(),
                  events: [
                    ...o.events,
                    { id: uid("evt"), type: "CANCELLED", payload: {}, actorId, at: nowIso() },
                  ],
                }
              : o
          ),
        });
      },

      setOrderStatus: (id, status, actorId, payload = {}) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order) return;
        set({
          orders: get().orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status,
                  updatedAt: nowIso(),
                  pickedUpAt: status === "PICKED_UP" ? nowIso() : o.pickedUpAt,
                  deliveredAt: status === "DELIVERED" ? nowIso() : o.deliveredAt,
                  events: [
                    ...o.events,
                    { id: uid("evt"), type: "STATUS_CHANGE", payload: { to: status, ...payload }, actorId, at: nowIso() },
                  ],
                }
              : o
          ),
        });
      },

      assignOrderToVehicle: (orderId, vehicleId, actorId, weightKg, partLabel) => {
        const order = get().orders.find((o) => o.id === orderId);
        const vehicle = get().vehicles.find((v) => v.id === vehicleId);
        if (!order || !vehicle) return null;
        const w = weightKg ?? order.weightKg;
        if (vehicle.capacityKg < w) return null;
        const driverId = vehicle.currentDriverId;
        if (!driverId) return null;
        const assignment: DispatchAssignment = {
          id: uid("dasg"),
          orderId,
          vehicleId,
          driverId,
          weightKg: w,
          partLabel,
          assignedAt: nowIso(),
          assignedBy: actorId,
          status: "ASSIGNED",
        };
        set({
          orders: get().orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "DISPATCHED",
                  updatedAt: nowIso(),
                  assignments: [...o.assignments, assignment],
                  events: [
                    ...o.events,
                    {
                      id: uid("evt"),
                      type: "DISPATCHED",
                      payload: { vehicleId, driverId, weightKg: w, partLabel },
                      actorId,
                      at: nowIso(),
                    },
                  ],
                }
              : o
          ),
          vehicles: get().vehicles.map((v) =>
            v.id === vehicleId
              ? {
                  ...v,
                  status: "BUSY",
                  activeAssignmentId: assignment.id,
                  routePolyline: buildPolyline(order.pickup, order.dropoff, 14),
                  routeProgress: 0,
                  currentLocation: order.pickup,
                }
              : v
          ),
          drivers: get().drivers.map((d) => (d.id === driverId ? { ...d, status: "BUSY" } : d)),
        });
        return assignment;
      },

      unassignOrder: (orderId, assignmentId, actorId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;
        const a = order.assignments.find((x) => x.id === assignmentId);
        if (!a) return;
        const remaining = order.assignments.filter((x) => x.id !== assignmentId);
        set({
          orders: get().orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: remaining.length === 0 ? "PENDING_DISPATCH" : o.status,
                  assignments: remaining,
                  updatedAt: nowIso(),
                  events: [
                    ...o.events,
                    { id: uid("evt"), type: "UNASSIGNED", payload: { assignmentId }, actorId, at: nowIso() },
                  ],
                }
              : o
          ),
          vehicles: get().vehicles.map((v) =>
            v.id === a.vehicleId
              ? { ...v, status: "AVAILABLE", activeAssignmentId: undefined, routePolyline: undefined, routeProgress: undefined }
              : v
          ),
          drivers: get().drivers.map((d) => (d.id === a.driverId ? { ...d, status: "AVAILABLE" } : d)),
        });
      },

      splitOrder: (orderId, parts) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return [];
        const total = parts.reduce((s, x) => s + x, 0);
        if (Math.abs(total - order.weightKg) > 0.5) return [];
        const newIds: string[] = [];
        const now = nowIso();
        const newOrders: Order[] = parts.map((kg, i) => {
          const id = uid("order");
          newIds.push(id);
          return {
            ...order,
            id,
            code: `${order.code}.${i + 1}`,
            weightKg: kg,
            description: `${order.description} (Phần ${i + 1}/${parts.length})`,
            assignments: [],
            status: "PENDING_DISPATCH",
            events: [
              {
                id: uid("evt"),
                type: "SPLIT_FROM",
                payload: { originalOrderId: order.id, partIndex: i + 1, totalParts: parts.length },
                actorId: "user",
                at: now,
              },
            ],
            createdAt: now,
            updatedAt: now,
          };
        });
        // mark original as cancelled (replaced by parts)
        set({
          orders: [
            ...get()
              .orders.map((o) =>
                o.id === orderId
                  ? ({
                      ...o,
                      status: "CANCELLED" as const,
                      updatedAt: now,
                      events: [
                        ...o.events,
                        {
                          id: uid("evt"),
                          type: "SPLIT_INTO",
                          payload: { newOrderIds: newIds },
                          actorId: "user",
                          at: now,
                        },
                      ],
                    } as Order)
                  : o
              ),
            ...newOrders,
          ],
        });
        // Quota: parent's reserved amount equals sum of parts; net zero — log as a single audit pair
        get().releaseQuota(order.customerId, order.weightKg, order.id, "user", "Tách đơn — giải phóng đơn gốc");
        for (const child of newOrders) {
          get().reserveQuota(order.customerId, child.weightKg, child.id, "user");
        }
        return newIds;
      },

      reportDeliveryFailure: (orderId, reasonId, notes, photos, actorId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;
        const reason = get().returnReasons.find((r) => r.id === reasonId);
        if (!reason) return;
        const now = nowIso();
        const refundedKg = Math.round((order.weightKg * reason.refundPercent) / 100);
        const consumedKg = order.weightKg - refundedKg;
        const ret: ReturnOrder = {
          id: uid("return"),
          code: `RT-${String(get().returns.length + 1).padStart(4, "0")}`,
          originalOrderId: order.id,
          reasonId: reason.id,
          reasonLabel: reason.label,
          reasonCategory: reason.category,
          refundPercent: reason.refundPercent,
          notes,
          evidencePhotos: photos,
          weightKg: order.weightKg,
          refundedKg,
          status: "CREATED",
          vehicleId: order.assignments[0]?.vehicleId,
          createdAt: now,
        };
        set({
          orders: get().orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "DELIVERY_FAILED",
                  updatedAt: now,
                  failureReasonId: reason.id,
                  failureNotes: notes,
                  deliveryEvidence: photos,
                  events: [
                    ...o.events,
                    {
                      id: uid("evt"),
                      type: "DELIVERY_FAILED",
                      payload: { reasonId: reason.id, reasonLabel: reason.label, refundPercent: reason.refundPercent, notes },
                      actorId,
                      at: now,
                    },
                  ],
                }
              : o
          ),
          returns: [ret, ...get().returns],
        });
        // Quota: release the refunded portion; convert the rest from reserved → used (charged to customer)
        if (refundedKg > 0) {
          get().releaseQuota(
            order.customerId,
            refundedKg,
            order.id,
            actorId,
            `Hoàn ${reason.refundPercent}% theo lý do "${reason.label}"`
          );
        }
        if (consumedKg > 0) {
          get().consumeReservedQuota(order.customerId, consumedKg, order.id, actorId);
        }
      },

      completeDelivery: (orderId, signature, photos, actorId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;
        const now = nowIso();
        // consume reserved → used (POSTPAID also bumps outstanding)
        get().consumeReservedQuota(order.customerId, order.weightKg, order.id, actorId);
        // free vehicle
        const a = order.assignments[0];
        if (a) {
          set({
            vehicles: get().vehicles.map((v) =>
              v.id === a.vehicleId
                ? { ...v, status: "AVAILABLE", activeAssignmentId: undefined, routePolyline: undefined, routeProgress: undefined }
                : v
            ),
            drivers: get().drivers.map((d) => (d.id === a.driverId ? { ...d, status: "AVAILABLE" } : d)),
          });
        }
        set({
          orders: get().orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "DELIVERED",
                  deliveredAt: now,
                  updatedAt: now,
                  signature,
                  deliveryEvidence: photos,
                  events: [
                    ...o.events,
                    { id: uid("evt"), type: "DELIVERED", payload: {}, actorId, at: now },
                  ],
                }
              : o
          ),
        });
      },

      setVehicleStatus: (vehicleId, status) => {
        set({
          vehicles: get().vehicles.map((v) => (v.id === vehicleId ? { ...v, status } : v)),
        });
      },

      setDriverStatus: (driverId, status) => {
        set({
          drivers: get().drivers.map((d) => (d.id === driverId ? { ...d, status } : d)),
        });
      },

      setVehicleLocation: (vehicleId, lat, lng, progress) => {
        set({
          vehicles: get().vehicles.map((v) =>
            v.id === vehicleId
              ? {
                  ...v,
                  currentLocation: { lat, lng },
                  routeProgress: progress ?? v.routeProgress,
                  lastGpsUpdate: nowIso(),
                  speedKmh: 35 + Math.round(Math.random() * 30),
                }
              : v
          ),
        });
      },

      pushNotification: (n) => {
        const item: AppNotification = { ...n, id: uid("notif"), read: false, createdAt: nowIso() };
        set({ notifications: [item, ...get().notifications].slice(0, 100) });
      },

      markAllRead: () => {
        set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) });
      },

      pushMessage: (m) => {
        const item: MockMessage = { ...m, id: uid("msg"), createdAt: nowIso() };
        set({ messages: [item, ...get().messages].slice(0, 50) });
      },

      raiseSos: (driverId, vehicleId, location, orderIds, message) => {
        const sos: SosAlert = {
          id: uid("sos"),
          driverId,
          vehicleId,
          location,
          orderIds,
          message,
          resolved: false,
          createdAt: nowIso(),
        };
        set({ sos: [sos, ...get().sos] });
        return sos;
      },

      resolveSos: (id) => {
        set({
          sos: get().sos.map((s) => (s.id === id ? { ...s, resolved: true, resolvedAt: nowIso() } : s)),
        });
      },

      addCyberLog: (entry) => {
        const e: CyberSyncEntry = { ...entry, id: uid("cyber"), at: nowIso() };
        set({ cyberLog: [e, ...get().cyberLog].slice(0, 30) });
      },

      importCyberOrders: (count) => {
        const customers = get().customers;
        const items: Order[] = [];
        for (let i = 0; i < count; i++) {
          const c = customers[Math.floor(Math.random() * customers.length)];
          const wp = [400, 800, 1500, 2500][i % 4];
          const product = PRODUCTS[i % PRODUCTS.length];
          const o = get().createOrder({
            customerId: c.id,
            pickup: {
              address: "Kho TT Tân Bình, HCM",
              lat: 10.8011,
              lng: 106.6529,
              contactName: "Kho",
              contactPhone: "02838000000",
            } as Location,
            dropoff: {
              address: "Đồng Nai - Biên Hòa",
              lat: 10.9574,
              lng: 106.8426,
              contactName: c.name,
              contactPhone: c.phone,
            } as Location,
            weightKg: wp,
            description: product,
            requestedDeliveryAt: new Date(Date.now() + 86400000).toISOString(),
            source: "CYBER",
            externalId: `CYBER-${Date.now()}-${i}`,
            status: "NEW",
          } as Parameters<DataState["createOrder"]>[0]);
          items.push(o);
        }
        get().addCyberLog({ kind: "ORDERS", count, ok: true, message: `Đồng bộ ${count} đơn từ Cyber` });
        return items;
      },
    }),
    {
      name: "data",
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
