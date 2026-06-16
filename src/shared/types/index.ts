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
  /** Kho mặc định/được gán (load-bearing cho khoá kho của DISPATCHER). */
  warehouseId?: string;
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

  /** Kho nhà (chỉ để hiển thị + soft-scoring điều phối; KHÔNG lọc cứng pool xe). */
  homeWarehouseId?: string;
}

// ----- Warehouse / Product / Inventory -----
export type WarehouseType = "MAIN" | "SATELLITE" | "TRANSIT";
export type WarehouseStatus = "ACTIVE" | "INACTIVE";

export interface Warehouse {
  id: string;
  code: string; // "KHO-TB"
  name: string;
  type: WarehouseType;
  status: WarehouseStatus;
  location: Location; // tái dùng Location (address + lat/lng + contact)
  capacityKg?: number;
  contactName?: string;
  contactPhone?: string;
  operatingHours?: string;
  createdAt: string;
}

export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface Product {
  id: string;
  sku: string;
  name: string;
  unit: string; // "thùng" | "kg" | "cái"
  unitWeightKg: number;
  category: string;
  status: ProductStatus;
  createdAt: string;
}

/** Hướng giao dịch tồn kho. */
export type StockDirection = "INBOUND" | "OUTBOUND" | "ADJUST";
/** Nguồn gốc giao dịch tồn kho. */
export type StockRefType = "ORDER" | "RETURN" | "MANUAL" | "SEED";

/**
 * Sổ cái tồn kho — append-only, theo mẫu QuotaTransaction/OdometerEntry.
 * Tồn kho được derive bằng cách fold qtyDelta (xem getWarehouseStock).
 */
export interface StockMovement {
  id: string;
  warehouseId: string;
  productId: string;
  qtyDelta: number; // có dấu: +nhập / -xuất
  direction: StockDirection;
  refType: StockRefType;
  refId?: string; // orderId / returnId / null
  weighedKg?: number; // số cân ghi nhận tại thời điểm (nếu có)
  note?: string;
  recordedBy: string; // userId
  at: string; // ISO
}

/** Dòng hàng (line-item) của đơn — sku/name/unitWeightKg là snapshot tại thời điểm tạo. */
export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitWeightKg: number;
}

// ----- Order -----
export type OrderStatus =
  | "NEW"
  | "PENDING_DISPATCH"
  | "PENDING_SUPERVISOR_REVIEW"
  | "PENDING_ACCEPT"
  | "DISPATCHED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "PENDING_PAYMENT"
  | "DELIVERED"
  | "DELIVERY_FAILED"
  | "RETURN_PROCESSING"
  | "RETURNING_TO_WAREHOUSE"
  | "RETURNED"
  | "CANCELLED"
  | "CANCELLED_AFTER_RETURN";

export interface SupervisorReview {
  requestedAt: string;
  requestedBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
  decision?: "APPROVED" | "REJECTED";
  rejectReason?: string;
}

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
  /** Kho gốc của đơn (origin). Dùng để scoping + điều phối theo kho. */
  warehouseId?: string;
  /** Hướng đơn: OUTBOUND = giao đi từ kho (mặc định khi vắng), INBOUND = nhập về kho. */
  direction?: "OUTBOUND" | "INBOUND";
  /** Trọng lượng khai báo gốc lúc tạo đơn — bảo toàn qua các lần adjustOrderWeight (ghi đè weightKg). */
  declaredWeightKg?: number;
  /** Dòng hàng theo SKU (tuỳ chọn — đơn weight-only cũ vẫn hợp lệ). */
  items?: OrderItem[];
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
  /** Số tiền thu hộ qua chuyển khoản (VND). 0/undefined = không thu, giao xong DELIVERED luôn. */
  codAmount?: number;
  /** Trạng thái thu hộ. Chỉ tồn tại với đơn có codAmount > 0. */
  codStatus?: "PENDING" | "VERIFYING" | "PAID";
  /** Mốc khách bấm "đã chuyển khoản" — bắt đầu đối soát. */
  codTransferAt?: string;
  /** Mốc hệ thống xác nhận đã nhận tiền. */
  codPaidAt?: string;
  /** Lịch sử override hạn mức (lúc tạo và/hoặc lúc điều độ tiếp nhận). */
  quotaOverrides?: QuotaOverrideRecord[];
  /** NCC đã chọn ở step 1 (sống xuyên suốt limbo trước khi có assignment). */
  carrierId?: string;
  /** Trạng thái duyệt giám sát khu vực (chỉ tồn tại khi NCC là BACKUP). */
  supervisorReview?: SupervisorReview;
  /**
   * Khi AI auto điều phối (mức 3) KHÔNG phân được, đơn rớt về điều phối viên (mức 2/1).
   * Set khi auto thất bại, clear khi phân xe thành công.
   */
  dispatchFallback?: {
    reason: string;
    /** Top gợi ý AI sẵn sàng cho điều phối viên chọn (mức 2). */
    suggestedVehicleIds: string[];
    /** true nếu phát sinh do tài xế cảnh báo sự cố (mức 1). */
    fromWarning?: boolean;
    at: string;
  };
  /** Số lần tài xế đã cảnh báo sự cố trên đơn này. */
  warningCount?: number;
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
  | "DRIVER_WARNING"
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
