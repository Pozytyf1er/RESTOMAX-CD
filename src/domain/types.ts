export type Currency = "XOF";
export type OrderStatus = "new" | "preparing" | "ready" | "served" | "cancelled";
export type PreparationStatus = "new" | "preparing" | "ready";
export type TableStatus = "available" | "occupied" | "reserved" | "cleaning" | "unavailable";
export type ReservationStatus = "pending" | "confirmed" | "arrived" | "seated" | "completed" | "cancelled" | "no_show";
export type StaffRole = "owner" | "manager" | "cashier" | "server" | "kitchen";

export interface Restaurant {
  id: string;
  name: string;
  city: string;
  currency: Currency;
  timezone: "Africa/Abidjan";
}

export type MenuItemType = "dish" | "drink";
export type MenuOptionType = "choice" | "extra";

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
}

export interface MenuOption {
  id: string;
  name: string;
  type: MenuOptionType;
  groupName?: string;
  price: number;
  active: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  type: MenuItemType;
  name: string;
  description: string;
  price: number;
  available: boolean;
  optionIds: string[];
}

export interface StockRecipe {
  menuItemId: string;
  quantityPerItem: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minimumQuantity: number;
  recipes: StockRecipe[];
  lastUnitCost?: number;
}

export type StockMovementType = "in" | "out";
export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  createdAt: string;
  source: "manual" | "sale" | "purchase";
  reference?: string;
}

export interface DiningTable {
  id: string;
  label: string;
  area: string;
  seats: number;
  status: TableStatus;
}

export interface OrderLine {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options?: string[];
  comment?: string;
  preparationStatus?: PreparationStatus;
  stockConsumed?: boolean;
}

export type PaymentMethod = "cash" | "mobile_money" | "card" | "other";
export interface OrderPayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  paidAt: string;
  paidAtISO?: string;
  cashSessionId?: string;
  reference?: string;
}

export interface Refund {
  id: string;
  orderId: string;
  paymentId: string;
  amount: number;
  method: PaymentMethod;
  reason: string;
  createdAtISO: string;
  recordedByRole: StaffRole;
  status: "pending" | "completed" | "cancelled";
  cashSessionId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
  createdAtISO: string;
}

export type PurchaseOrderStatus = "ordered" | "partially_received" | "received" | "cancelled";

export interface PurchaseOrderLine {
  id: string;
  inventoryItemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  createdAtISO: string;
  expectedAtISO?: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  notes?: string;
}

export interface GoodsReceiptLine {
  purchaseOrderLineId: string;
  inventoryItemId: string;
  quantity: number;
}

export interface GoodsReceipt {
  id: string;
  purchaseOrderId: string;
  receivedAtISO: string;
  lines: GoodsReceiptLine[];
  receivedByRole: StaffRole;
}

export type ExpenseCategory = "supplies" | "rent" | "utilities" | "salaries" | "maintenance" | "marketing" | "other";
export type CashSessionStatus = "open" | "closed";
export type CashMovementType = "in" | "out";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  method: PaymentMethod;
  dateISO: string;
  createdAtISO: string;
  recordedByRole: StaffRole;
  cashSessionId?: string;
}

export interface CashSession {
  id: string;
  openedAtISO: string;
  openedByRole: StaffRole;
  openingBalance: number;
  status: CashSessionStatus;
  closedAtISO?: string;
  closedByRole?: StaffRole;
  expectedBalance?: number;
  countedBalance?: number;
  variance?: number;
}

export interface CashMovement {
  id: string;
  sessionId: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  createdAtISO: string;
  recordedByRole: StaffRole;
  relatedRefundId?: string;
}

export interface Reservation {
  id: string;
  customerName: string;
  phone: string;
  partySize: number;
  dateISO: string;
  time: string;
  durationMinutes: number;
  tableId?: string;
  tableLabel?: string;
  status: ReservationStatus;
  notes?: string;
  createdAtISO: string;
  updatedAtISO?: string;
}

export interface RestaurantOrder {
  id: string;
  customerId?: string;
  tableLabel: string;
  customerName: string;
  createdAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  payments?: OrderPayment[];
  closedAt?: string;
  createdAtISO?: string;
  closedAtISO?: string;
  closedByRole?: StaffRole;
  paymentStatus?: "unpaid" | "partial" | "paid" | "partially_refunded" | "refunded";
  preparedByRole?: StaffRole;
  servedByRole?: StaffRole;
  servedAtISO?: string;
  readyAtISO?: string;
}


export interface CustomerRewardHistory { rewardName: string; redeemedAt: string; rewardId?: string; redemptionId?: string; }
export type LoyaltyTransactionType = "earned" | "refund_reversal" | "redeemed";
export interface LoyaltyTransaction {
  id: string;
  type: LoyaltyTransactionType;
  points: number;
  saleId?: string;
  refundId?: string;
  rewardId?: string;
  amountXOF?: number;
  createdAtISO: string;
}
export interface Customer { id: string; name: string; phone: string; email: string; birthday?: string; preferences: string; notes: string; marketingConsent: boolean; points: number; createdAt: string; rewardHistory: CustomerRewardHistory[]; loyaltyTransactions?: LoyaltyTransaction[]; }
export interface LoyaltyReward { id: string; name: string; description: string; pointsCost: number; active: boolean; }

export type PlatformRestaurantStatus = "active" | "trial" | "overdue" | "suspended" | "terminated";
export type PlatformUserRole = "super_admin" | "support" | "sales" | "technical" | "accounting" | "owner";
export type PlatformTicketStatus = "open" | "in_progress" | "resolved";
export type PlatformTicketPriority = "low" | "normal" | "high" | "urgent";

export interface PlatformRestaurant {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  city: string;
  country: string;
  planName: string;
  status: PlatformRestaurantStatus;
  userCount: number;
  createdAtISO: string;
  lastActivityISO: string;
  renewalAtISO?: string;
  internalNote?: string;
}

export interface PlatformPlan {
  id: string;
  name: string;
  description: string;
  monthlyPriceXOF?: number;
  maxUsers: number;
  maxEstablishments: number;
  maxTables: number;
  features: string[];
  active: boolean;
}

export interface PlatformSubscription {
  id: string;
  restaurantId: string;
  restaurantName: string;
  planId: string;
  planName: string;
  status: "active" | "trial" | "overdue" | "cancelled";
  startedAtISO: string;
  renewsAtISO?: string;
  amountXOF?: number;
}

export interface PlatformInvoice {
  id: string;
  number: string;
  restaurantId: string;
  restaurantName: string;
  amountXOF?: number;
  issuedAtISO: string;
  dueAtISO: string;
  status: "paid" | "pending" | "overdue" | "void";
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: PlatformUserRole;
  restaurantId?: string;
  active: boolean;
  lastLoginAtISO?: string;
}

export interface SupportTicket {
  id: string;
  restaurantId: string;
  restaurantName: string;
  subject: string;
  category: string;
  priority: PlatformTicketPriority;
  status: PlatformTicketStatus;
  createdAtISO: string;
  updatedAtISO: string;
  messagesCount: number;
  assignedTo?: string;
}

export interface PlatformAuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAtISO: string;
  description: string;
}

export interface SupportAccessGrant {
  id: string;
  restaurantId: string;
  restaurantName: string;
  requestedBy: string;
  reason: string;
  scope: "read_only" | "limited";
  startsAtISO: string;
  expiresAtISO: string;
  status: "pending" | "active" | "revoked" | "expired";
}

export type StaffShiftStatus = "scheduled" | "completed" | "cancelled";
export type AttendanceStatus = "present" | "late" | "absent";

export interface StaffShift {
  id: string;
  staffId: string;
  dateISO: string;
  startTime: string;
  endTime: string;
  status: StaffShiftStatus;
  notes?: string;
  createdAtISO: string;
}

export interface AttendanceEntry {
  id: string;
  staffId: string;
  shiftId: string;
  dateISO: string;
  checkInISO: string;
  checkOutISO?: string;
  status: AttendanceStatus;
  notes?: string;
}

export type PermissionKey =
  | "orders.view" | "orders.create" | "orders.cancel"
  | "payments.collect" | "payments.refund"
  | "menu.view" | "menu.manage" | "menu.price"
  | "tables.manage" | "reservations.manage"
  | "kitchen.manage" | "inventory.view" | "inventory.manage"
  | "reports.view" | "finance.view" | "finance.manage"
  | "staff.manage" | "settings.manage";

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  active: boolean;
  phone?: string;
  email?: string;
  permissions?: Partial<Record<PermissionKey, boolean>>;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Nouvelle",
  preparing: "En préparation",
  ready: "Prête",
  served: "Servie",
  cancelled: "Annulée",
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Propriétaire",
  manager: "Manager",
  cashier: "Caissier",
  server: "Serveur",
  kitchen: "Cuisine / Bar",
};