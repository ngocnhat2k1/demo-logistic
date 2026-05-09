"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/db/persist";
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
  ReturnReason,
  Location,
} from "@/types";
import { buildSeed } from "@/lib/mock/seed";
import { uid } from "@/lib/utils";
import { buildPolyline } from "@/lib/mock/geo";

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
  _hasHydrated: boolean;
  setHydrated: () => void;

  // bootstrap
  ensureSeeded: () => void;
  resetAll: () => void;

  // customer / quota
  consumeQuota: (customerId: string, kg: number, orderId: string, actorId: string) => boolean;
  refundQuota: (customerId: string, kg: number, orderId: string, actorId: string, reason: string) => void;
  resetMonthlyQuota: (customerId: string) => void;

  // orders
  createOrder: (
    input: Omit<Order, "id" | "code" | "status" | "events" | "assignments" | "createdAt" | "updatedAt"> & { status?: OrderStatus }
  ) => Order;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  cancelOrder: (id: string, actorId: string) => void;
  setOrderStatus: (id: string, status: OrderStatus, actorId: string, payload?: Record<string, unknown>) => void;
  assignOrderToVehicle: (orderId: string, vehicleId: string, actorId: string, weightKg?: number, partLabel?: string) => DispatchAssignment | null;
  unassignOrder: (orderId: string, assignmentId: string, actorId: string) => void;
  splitOrder: (orderId: string, parts: number[]) => string[]; // returns new order ids
  reportDeliveryFailure: (orderId: string, reason: ReturnReason, notes: string, photos: string[], actorId: string) => void;
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

      consumeQuota: (customerId, kg, orderId, actorId) => {
        const c = get().customers.find((x) => x.id === customerId);
        if (!c) return false;
        const newUsed = c.quota.used + kg;
        if (newUsed > c.quota.limit) return false;
        const tx: QuotaTransaction = {
          id: uid("qt"),
          type: "CONSUME",
          amount: kg,
          orderId,
          reason: "Đã giao đơn",
          actorId,
          createdAt: nowIso(),
        };
        const updated: Quota = { ...c.quota, used: newUsed, history: [...c.quota.history, tx] };
        set({
          customers: get().customers.map((x) => (x.id === customerId ? { ...x, quota: updated } : x)),
        });
        return true;
      },

      refundQuota: (customerId, kg, orderId, actorId, reason) => {
        const c = get().customers.find((x) => x.id === customerId);
        if (!c) return;
        const newUsed = Math.max(0, c.quota.used - kg);
        const tx: QuotaTransaction = {
          id: uid("qt"),
          type: "REFUND",
          amount: kg,
          orderId,
          reason,
          actorId,
          createdAt: nowIso(),
        };
        const updated: Quota = { ...c.quota, used: newUsed, history: [...c.quota.history, tx] };
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
        const updated: Quota = { ...c.quota, used: 0, lastResetAt: nowIso(), history: [...c.quota.history, tx] };
        set({
          customers: get().customers.map((x) => (x.id === customerId ? { ...x, quota: updated } : x)),
        });
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
        return order;
      },

      updateOrder: (id, patch) => {
        set({
          orders: get().orders.map((o) =>
            o.id === id ? { ...o, ...patch, updatedAt: nowIso() } : o
          ),
        });
      },

      cancelOrder: (id, actorId) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order) return;
        // refund quota if not delivered
        if (order.status !== "DELIVERED" && order.status !== "RETURNED") {
          // check if quota has been consumed (only after delivery in our model) -- nothing to refund
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
        return newIds;
      },

      reportDeliveryFailure: (orderId, reason, notes, photos, actorId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;
        const now = nowIso();
        const ret: ReturnOrder = {
          id: uid("return"),
          code: `RT-${String(get().returns.length + 1).padStart(4, "0")}`,
          originalOrderId: order.id,
          reason,
          notes,
          evidencePhotos: photos,
          weightKg: order.weightKg,
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
                  failureReason: reason,
                  failureNotes: notes,
                  deliveryEvidence: photos,
                  events: [
                    ...o.events,
                    {
                      id: uid("evt"),
                      type: "DELIVERY_FAILED",
                      payload: { reason, notes },
                      actorId,
                      at: now,
                    },
                  ],
                }
              : o
          ),
          returns: [ret, ...get().returns],
        });
        // refund quota immediately upon failure
        get().refundQuota(order.customerId, order.weightKg, order.id, actorId, "Giao thất bại - hoàn hạn mức");
      },

      completeDelivery: (orderId, signature, photos, actorId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;
        const now = nowIso();
        // consume quota if not already done
        get().consumeQuota(order.customerId, order.weightKg, order.id, actorId);
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
