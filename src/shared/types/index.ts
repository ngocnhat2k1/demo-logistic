// ----- Common -----
export interface LatLng {
  lat: number;
  lng: number;
}

export interface Location {
  address: string;
  lat: number;
  lng: number;
  contactName?: string;
  contactPhone?: string;
}

// ----- User / RBAC -----
export type UserRole =
  | "ADMIN"
  | "OPS_MANAGER"
  | "DISPATCHER"
  | "SALES"
  | "DRIVER"
  | "CUSTOMER";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  /** With merged Vehicle+Driver model, drivers log in as the vehicle they own (1:1). */
  vehicleId?: string;
  customerId?: string;
}

// ----- Customer + Quota -----
export type QuotaType = "POSTPAID" | "MONTHLY" | "PREPAID";

export interface QuotaTransaction {
  id: string;
  type: "CONSUME" | "REFUND" | "RESET" | "TOPUP" | "RESERVE" | "RELEASE" | "PAYMENT";
  amount: number; // kg, positive
  orderId?: string;
  reason: string;
  actorId: string;
  createdAt: string; // ISO
}

export interface Quota {
  type: QuotaType;
  limit: number; // kg; ignored for POSTPAID (no cap)
  reserved: number; // kg in-flight: order created but not yet DELIVERED/cancelled
  used: number; // kg actually consumed (DELIVERED or counted-as-used returns)
  outstanding?: number; // POSTPAID only: kg delivered but not yet paid
  resetCycle?: "MONTHLY" | "NEVER";
  lastResetAt?: string;
  history: QuotaTransaction[];
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  taxCode?: string;
  phone: string;
  email?: string;
  address: string;
  quota: Quota;
  source: "CYBER" | "MANUAL" | "IMPORT";
  externalId?: string;
  createdAt: string;
}

// ----- Carrier / Vehicle (merged with Driver: 1 vehicle = 1 driver) -----
export interface Carrier {
  id: string;
  code: string; // TTM, VNA, DXP, BACKUP
  name: string;
  type: "INTERNAL" | "BACKUP";
  contactPhone: string;
}

export type VehicleStatus = "AVAILABLE" | "BUSY" | "MAINTENANCE" | "BROKEN" | "OFF_DUTY";
export type VehicleType = "BOX" | "TANK" | "CONTAINER" | "FLATBED";
export type LicenseClass = "B2" | "C" | "D" | "E" | "FC";

export interface OdometerEntry {
  id: string;
  /** Total odometer reading at time of recording (km). */
  km: number;
  /** Distance added since the previous reading (km). */
  addedKm: number;
  recordedAt: string; // ISO
  recordedBy: string; // userId
  orderId?: string;
  orderCode?: string;
  note?: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  capacityKg: number;
  type: VehicleType;
  carrierId: string;
  status: VehicleStatus;
  currentLocation: LatLng;
  speedKmh?: number;
  lastGpsUpdate?: string;
  routePolyline?: LatLng[];
  routeProgress?: number; // 0..1
  activeAssignmentId?: string;

  // ----- Merged driver fields (1 vehicle = 1 driver) -----
  driverName: string;
  driverPhone: string;
  driverLicenseClass: LicenseClass;
  /** How many completed trips this vehicle/driver has done (analytics). */
  routeHistoryCount?: number;

  // ----- Odometer / maintenance -----
  /** Current cumulative odometer reading (km). */
  odometerKm: number;
  /** Odometer reading at the most recent maintenance reset (km). */
  lastMaintenanceOdometerKm: number;
  /** Interval between maintenance cycles (km). Defaults to 10000. */
  maintenanceIntervalKm: number;
  /** Most recent odometer reading entries (latest first, capped). */
  odometerHistory: OdometerEntry[];
}

// ----- Order -----
export type OrderStatus =
  | "NEW"
  | "PENDING_DISPATCH"
  | "PENDING_ACCEPT"
  | "DISPATCHED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "DELIVERY_FAILED"
  | "RETURN_PROCESSING"
  | "RETURNING_TO_WAREHOUSE"
  | "RETURNED"
  | "CANCELLED"
  | "CANCELLED_AFTER_RETURN";

export interface DispatchAssignment {
  id: string;
  orderId: string;
  vehicleId: string;
  weightKg: number;
  partLabel?: string;
  assignedAt: string;
  assignedBy: string;
  status:
    | "PENDING_ACCEPT"
    | "ASSIGNED"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "DELIVERED"
    | "FAILED"
    | "REJECTED";
  acceptedAt?: string;
  rejectedAt?: string;
  rejectReason?: string;
}

export interface OrderEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  actorId: string;
  at: string;
}

export interface QuotaOverrideRecord {
  actorId: string;
  actorName: string;
  role: UserRole;
  reason: string;
  at: string;
  customerId: string;
  attemptedKg: number;
  quotaSnapshot: { reserved: number; used: number; limit: number; type: QuotaType };
}

export interface Order {
  id: string;
  code: string;
  customerId: string;
  status: OrderStatus;
  pickup: Location;
  dropoff: Location;
  weightKg: number;
  /** Trọng lượng hàng thực tế đo lúc điều độ tiếp nhận (kg). Khác weightKg khi có chênh lệch. */
  actualWeightKg?: number;
  /** Ghi chú chi phí phát sinh do chênh lệch trọng lượng. */
  extraCostNote?: string;
  description: string;
  notes?: string;
  requestedDeliveryAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  assignments: DispatchAssignment[];
  source: "CYBER" | "MANUAL" | "IMPORT";
  externalId?: string;
  events: OrderEvent[];
  createdAt: string;
  updatedAt: string;
  deliveryEvidence?: string[]; // data URLs
  signature?: string; // data URL
  failureReasonId?: string;
  failureNotes?: string;
  /** Lịch sử override hạn mức (lúc tạo và/hoặc lúc điều độ tiếp nhận). */
  quotaOverrides?: QuotaOverrideRecord[];
}

// ----- Return -----
export type ReturnReasonCategory = "FORCE_MAJEURE" | "CUSTOMER_FAULT";

export interface ReturnReasonConfig {
  id: string;
  code: string; // built-in like CUSTOMER_REJECTED, or CUSTOM_xxx
  label: string;
  category: ReturnReasonCategory;
  refundPercent: number; // 0-100
  active: boolean;
  isBuiltIn: boolean;
}

export interface ReturnOrder {
  id: string;
  code: string;
  originalOrderId: string;
  reasonId: string;
  reasonLabel: string; // snapshot of label at time of creation
  reasonCategory: ReturnReasonCategory; // snapshot
  refundPercent: number; // snapshot
  notes?: string;
  evidencePhotos: string[];
  weightKg: number;
  refundedKg: number;
  status: "CREATED" | "PROCESSING" | "RETURNING" | "COMPLETED";
  vehicleId?: string;
  createdAt: string;
  completedAt?: string;
}

// ----- Notification -----
export type NotificationType =
  | "ORDER_DISPATCHED"
  | "ORDER_DELIVERED"
  | "ORDER_FAILED"
  | "ASSIGNMENT_REJECTED"
  | "QUOTA_WARNING"
  | "EMERGENCY_SOS"
  | "ETA_UPDATE"
  | "CYBER_SYNC"
  | "GENERIC";

export type NotificationSeverity = "info" | "success" | "warning" | "destructive";

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  targetRoles?: UserRole[];
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface MockMessage {
  id: string;
  channel: "SMS" | "EMAIL";
  to: string;
  subject?: string;
  body: string;
  createdAt: string;
}

// ----- SOS -----
export interface SosAlert {
  id: string;
  vehicleId: string;
  location: LatLng;
  orderIds: string[];
  message?: string;
  photos?: string[];
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

// ----- Cyber Sync log -----
export interface CyberSyncEntry {
  id: string;
  kind: "ORDERS" | "CUSTOMERS";
  count: number;
  ok: boolean;
  message: string;
  at: string;
}
