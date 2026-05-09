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
export type UserRole = "ADMIN" | "OPS_MANAGER" | "DISPATCHER" | "SALES" | "DRIVER";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  driverId?: string;
}

// ----- Customer + Quota -----
export type QuotaType = "POSTPAID" | "MONTHLY" | "PREPAID";

export interface QuotaTransaction {
  id: string;
  type: "CONSUME" | "REFUND" | "RESET" | "TOPUP";
  amount: number; // kg, positive
  orderId?: string;
  reason: string;
  actorId: string;
  createdAt: string; // ISO
}

export interface Quota {
  type: QuotaType;
  limit: number;
  used: number;
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

// ----- Carrier / Vehicle / Driver -----
export interface Carrier {
  id: string;
  code: string; // TTM, VNA, DXP, BACKUP
  name: string;
  type: "INTERNAL" | "BACKUP";
  contactPhone: string;
}

export type VehicleStatus = "AVAILABLE" | "BUSY" | "MAINTENANCE" | "BROKEN";
export type VehicleType = "BOX" | "TANK" | "CONTAINER" | "FLATBED";

export interface Vehicle {
  id: string;
  plateNumber: string;
  capacityKg: number;
  type: VehicleType;
  carrierId: string;
  status: VehicleStatus;
  currentLocation: LatLng;
  currentDriverId?: string;
  speedKmh?: number;
  lastGpsUpdate?: string;
  routePolyline?: LatLng[];
  routeProgress?: number; // 0..1
  activeAssignmentId?: string;
}

export type DriverStatus = "AVAILABLE" | "BUSY" | "OFF_DUTY";

export interface Driver {
  id: string;
  fullName: string;
  phone: string;
  licenseClass: "B2" | "C" | "D" | "E" | "FC";
  status: DriverStatus;
  currentVehicleId?: string;
  carrierId: string;
  routeHistoryCount?: number;
}

// ----- Order -----
export type OrderStatus =
  | "NEW"
  | "PENDING_DISPATCH"
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
  driverId: string;
  weightKg: number;
  partLabel?: string;
  assignedAt: string;
  assignedBy: string;
  status: "ASSIGNED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "FAILED";
}

export interface OrderEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  actorId: string;
  at: string;
}

export interface Order {
  id: string;
  code: string;
  customerId: string;
  status: OrderStatus;
  pickup: Location;
  dropoff: Location;
  weightKg: number;
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
  failureReason?: ReturnReason;
  failureNotes?: string;
}

// ----- Return -----
export type ReturnReason =
  | "CUSTOMER_REJECTED"
  | "NO_CONTACT"
  | "WRONG_ADDRESS"
  | "DAMAGED_GOODS"
  | "CUSTOMER_REQUEST"
  | "VEHICLE_BREAKDOWN";

export interface ReturnOrder {
  id: string;
  code: string;
  originalOrderId: string;
  reason: ReturnReason;
  notes?: string;
  evidencePhotos: string[];
  weightKg: number;
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
  driverId: string;
  vehicleId: string;
  location: LatLng;
  orderIds: string[];
  message?: string;
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
