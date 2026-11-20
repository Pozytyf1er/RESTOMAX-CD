import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell, Boxes, CalendarDays, ChefHat, ChevronDown, ChartNoAxesCombined, Search,
  CircleDollarSign, ClipboardList, LayoutDashboard, Menu as MenuIcon,
  Settings, Store, Users, Utensils, X, UserRound, ShieldCheck, QrCode, LockKeyhole, Crown, ArrowRight,
} from "lucide-react";
import { demoCategories, demoInventory, demoMenu, demoMenuOptions, demoOrders, demoRestaurant, demoStaff, demoTables, demoCustomers, demoLoyaltyRewards, demoReservations, demoExpenses, demoCashSessions, demoCashMovements, demoSuppliers, demoPurchaseOrders, demoGoodsReceipts, demoShifts, demoAttendance, demoPlatformRestaurants, demoPlatformPlans, demoPlatformSubscriptions, demoPlatformInvoices, demoPlatformUsers, demoSupportTickets, demoPlatformAuditEvents, demoSupportAccessGrants, demoRefunds } from "./data/demo";
import { ORDER_STATUS_LABELS, type DiningTable, type MenuCategory, type MenuItem, type MenuOption, type OrderStatus, type RestaurantOrder, type InventoryItem, type StockMovement, type StockMovementType, type Customer, type LoyaltyReward, type Reservation, type ReservationStatus, type StaffMember, type StaffRole, type PermissionKey, type Expense, type CashSession, type CashMovement, type Supplier, type PurchaseOrder, type GoodsReceipt, type PurchaseOrderLine, type GoodsReceiptLine, type StaffShift, type AttendanceEntry, type PlatformRestaurant, type PlatformPlan, type PlatformSubscription, type PlatformInvoice, type PlatformUser, type SupportTicket, type PlatformAuditEvent, type SupportAccessGrant, type PlatformRestaurantStatus, type PlatformTicketStatus, type Refund } from "./domain/types";
import MenuManagement from "./components/MenuManagement";
import CustomerOrdering from "./components/CustomerOrdering";
import KitchenBar from "./components/KitchenBar";
import CashRegister from "./components/CashRegister";
import InventoryManagement from "./components/InventoryManagement";
import TablesManagement from "./components/TablesManagement";
import CustomerManagement from "./components/CustomerManagement";
import ReportsStatistics from "./components/ReportsStatistics";
import RestaurantDashboard from "./components/RestaurantDashboard";
import SubscriptionManagement from "./components/SubscriptionManagement";
import ReservationsManagement from "./components/ReservationsManagement";
import TeamManagement from "./components/TeamManagement";
import FinanceManagement from "./components/FinanceManagement";
import PurchasingManagement from "./components/PurchasingManagement";
import SuperAdminPortal from "./components/SuperAdminPortal";
import { canCancelOrder, canCloseSale, canOrderAtTableStatus, canRecordPayment, orderTotal, paidTotal } from "./domain/sales";
import { canTransitionPreparationStatus } from "./domain/kitchen";
import { canReduceReservationTableCapacity, canRemoveReservationTable, canTransitionReservation, reservationHoldsTable, validateReservation } from "./domain/reservations";
import { canAssignRole, canGrantCustomPermission, canManageStaff, rolePermissionCeiling } from "./domain/permissions";
import { canCloseCashSession, canOpenCashSession, canRecordCashMovement, canRecordExpense, calculateExpectedCash } from "./domain/finance";
import { applyPurchaseReceipt, canCreatePurchaseOrder, canReceivePurchaseOrder } from "./domain/purchasing";
import { canCreateInventoryItem, canRecordStockMovement, canUpdateStockRecipe, canUpdateStockThreshold, getStockReversalQuantities, roundStockQuantity } from "./domain/inventory";
import { attendanceStatusForShift, canCancelShift, canCheckIn, canCheckOut, canCreateShift } from "./domain/hr";
import { canChangeRestaurantStatus, canCreatePlatformRestaurant as validatePlatformRestaurant, canCreateSupportGrant as validateSupportGrant, canReviewSupportGrant, canTogglePlatformUser } from "./domain/platform";
import { canCancelRefund, canCompleteRefund, canRecordRefund, getOrderPaymentStatus } from "./domain/refunds";
import { awardSalePoints, findLoyaltyCustomerForOrder, redeemLoyaltyReward, reverseRefundPoints } from "./domain/loyalty";

type Page = "overview" | "orders" | "menu" | "customer" | "kitchen" | "bar" | "cash" | "inventory" | "tables" | "customers" | "reports" | "team" | "roles" | "settings" | "subscription" | "reservations" | "finance" | "purchases" | "qr" | "security" | "platform";

const mainNavItems: { id: Page; label: string; icon: typeof LayoutDashboard; disabled?: boolean }[] = [
  { id: "overview", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "orders", label: "Commandes", icon: ClipboardList },
  { id: "kitchen", label: "Cuisine et bar", icon: ChefHat },
  { id: "menu", label: "Menu et carte", icon: Utensils },
  { id: "inventory", label: "Stocks et achats", icon: Boxes },
  { id: "finance", label: "Finances", icon: CircleDollarSign },
  { id: "reports", label: "Rapports", icon: ChartNoAxesCombined },
  { id: "team", label: "Employés", icon: Users },
  { id: "roles", label: "Rôles et accès", icon: ShieldCheck },
  { id: "customers", label: "Clients et fidélité", icon: UserRound },
  { id: "reservations", label: "Réservations et salle", icon: CalendarDays },
  { id: "qr", label: "QR codes et chevalets", icon: QrCode, disabled: true },
  { id: "settings", label: "Paramètres", icon: Settings },
  { id: "security", label: "Sécurité", icon: LockKeyhole, disabled: true },
];

const money = (amount: number) => new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: "XOF", maximumFractionDigits: 0,
}).format(amount);

function App() {
  const [page, setPage] = useState<Page>("overview");
  const [orders, setOrders] = useState<RestaurantOrder[]>(demoOrders);
  const [inventory, setInventory] = useState<InventoryItem[]>(demoInventory);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [stockAlert, setStockAlert] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>(demoMenu);
  const [categories, setCategories] = useState<MenuCategory[]>(demoCategories);
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>(demoMenuOptions);
  const [tables, setTables] = useState<DiningTable[]>(demoTables);
  const [customers, setCustomers] = useState<Customer[]>(demoCustomers);
  const [reservations, setReservations] = useState<Reservation[]>(demoReservations);
  const [staff, setStaff] = useState<StaffMember[]>(demoStaff);
  const [expenses, setExpenses] = useState<Expense[]>(demoExpenses);
  const [refunds, setRefunds] = useState<Refund[]>(demoRefunds);
  const [cashSessions, setCashSessions] = useState<CashSession[]>(demoCashSessions);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(demoCashMovements);
  const [suppliers, setSuppliers] = useState<Supplier[]>(demoSuppliers);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(demoPurchaseOrders);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>(demoGoodsReceipts);
  const [shifts, setShifts] = useState<StaffShift[]>(demoShifts);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>(demoAttendance);
  const [platformRestaurants, setPlatformRestaurants] = useState<PlatformRestaurant[]>(demoPlatformRestaurants);
  const [platformPlans, setPlatformPlans] = useState<PlatformPlan[]>(demoPlatformPlans);
  const [platformSubscriptions, setPlatformSubscriptions] = useState<PlatformSubscription[]>(demoPlatformSubscriptions);
  const [platformInvoices] = useState<PlatformInvoice[]>(demoPlatformInvoices);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>(demoPlatformUsers);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(demoSupportTickets);
  const [platformAuditEvents, setPlatformAuditEvents] = useState<PlatformAuditEvent[]>(demoPlatformAuditEvents);
  const [supportAccessGrants, setSupportAccessGrants] = useState<SupportAccessGrant[]>(demoSupportAccessGrants);
  const [loyaltyRewards] = useState<LoyaltyReward[]>(demoLoyaltyRewards);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [cashTargetOrderId, setCashTargetOrderId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const closedSalesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);
  useEffect(() => {
    if (page !== "cash") setCashTargetOrderId(null);
  }, [page]);

  const activeOrders = orders.filter((order) => order.status !== "cancelled" && !order.closedAt && !order.closedAtISO);
  const normalizedSearch = globalSearch.trim().toLocaleLowerCase("fr");
  const searchResults = normalizedSearch ? [
    ...orders.filter((order) => `${order.id} ${order.customerName} ${order.tableLabel} ${order.lines.map((line) => line.name).join(" ")}`.toLocaleLowerCase("fr").includes(normalizedSearch)).slice(0, 4).map((order) => ({ id: order.id, label: order.id, detail: `${order.customerName} · ${order.tableLabel}`, page: "orders" as Page })),
    ...menuItems.filter((item) => `${item.name} ${item.description}`.toLocaleLowerCase("fr").includes(normalizedSearch)).slice(0, 3).map((item) => ({ id: item.id, label: item.name, detail: "Article du menu", page: "menu" as Page })),
    ...tables.filter((table) => `${table.label} ${table.area}`.toLocaleLowerCase("fr").includes(normalizedSearch)).slice(0, 2).map((table) => ({ id: table.id, label: table.label, detail: `Table · ${table.area}`, page: "tables" as Page })),
    ...customers.filter((customer) => `${customer.name} ${customer.phone}`.toLocaleLowerCase("fr").includes(normalizedSearch)).slice(0, 3).map((customer) => ({ id: customer.id, label: customer.name, detail: customer.phone, page: "customers" as Page })),
    ...reservations.filter((reservation) => `${reservation.customerName} ${reservation.phone} ${reservation.tableLabel ?? ""}`.toLocaleLowerCase("fr").includes(normalizedSearch)).slice(0, 3).map((reservation) => ({ id: reservation.id, label: reservation.customerName, detail: `Réservation · ${reservation.dateISO} à ${reservation.time}`, page: "reservations" as Page })),
  ].slice(0, 8) : [];
  function openSearchResult(result: (typeof searchResults)[number]) {
    setPage(result.page);
    setGlobalSearch("");
    setMobileNavOpen(false);
  }
  function createCustomerOrder(order: { customerId?: string; customerName: string; tableLabel: string; lines: import("./domain/types").OrderLine[] }): boolean {
    const customerName = order.customerName.trim();
    const selectedTable = order.tableLabel === "À emporter" ? null : tables.find((table) => table.label === order.tableLabel && canOrderAtTableStatus(table.status));
    if (!customerName || customerName.length > 60 || !order.lines.length || (order.customerId && !customers.some((customer) => customer.id === order.customerId))) {
      setStockAlert("La commande doit comporter un nom client valide et au moins un article.");
      return false;
    }
    if (order.tableLabel !== "À emporter" && !selectedTable) {
      setStockAlert("Cette table n’est plus disponible. Sélectionnez une autre table.");
      return false;
    }
    const invalidLine = order.lines.find((line) => {
      const item = menuItems.find((entry) => entry.id === line.itemId);
      return !item || !item.available || !Number.isSafeInteger(line.quantity) || line.quantity < 1
        || !Number.isSafeInteger(line.unitPrice) || line.unitPrice < item.price;
    });
    const orderTotalValue = order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    if (invalidLine || !Number.isSafeInteger(orderTotalValue) || orderTotalValue <= 0) {
      setStockAlert("Un article n’est plus disponible ou son prix/sa quantité est invalide. Le panier a été conservé.");
      return false;
    }
    const now = new Date();
    const createdAt = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const orderId = "CMD-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    setOrders((current) => [{ id: orderId, ...(order.customerId ? { customerId: order.customerId } : {}), tableLabel: order.tableLabel, customerName, createdAt, createdAtISO: now.toISOString(), status: "new", paymentStatus: "unpaid", lines: order.lines.map((line) => ({ ...line, preparationStatus: "new" })) }, ...current]);
    if (selectedTable) {
      setTables((current) => current.map((table) => table.id === selectedTable.id ? { ...table, status: "occupied" } : table));
    }
    setStockAlert("");
    return true;
  }

  function updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order || order.status === "served" || order.status === "cancelled") return;
    if (status === "preparing" && order.status !== "new") return;
    if (status === "ready" && order.status !== "preparing") return;
    if (status === "served" && order.status !== "ready") return;
    if (status === "cancelled" && !canCancelOrder(order)) {
      setStockAlert("Cette commande a déjà été servie ou partiellement encaissée. Utilisez le processus de remboursement avant toute correction.");
      return;
    }
    if (status === "preparing") {
      const unconsumed = order.lines.filter((line) => !line.stockConsumed);
      const requirements = inventory.flatMap((ingredient) => {
        const quantity = unconsumed.reduce((sum, line) => {
          const recipe = ingredient.recipes.find((entry) => entry.menuItemId === line.itemId);
          return sum + (recipe ? recipe.quantityPerItem * line.quantity : 0);
        }, 0);
        return quantity > 0 ? [{ ingredient, quantity }] : [];
      });
      const shortage = requirements.find(({ ingredient, quantity }) => ingredient.quantity < quantity);
      if (shortage) {
        setStockAlert(`Stock insuffisant : ${shortage.ingredient.name}. Disponible : ${shortage.ingredient.quantity} ${shortage.ingredient.unit}, nécessaire : ${shortage.quantity} ${shortage.ingredient.unit}.`);
        return;
      }
      const now = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      const movements: StockMovement[] = requirements.map(({ ingredient, quantity }) => ({
        id: "MOV-" + Date.now().toString().slice(-7) + "-" + ingredient.id,
        inventoryItemId: ingredient.id, type: "out", quantity,
        reason: `Consommation préparation · ${order.id}`, createdAt: now,
        source: "sale", reference: order.id,
      }));
      setInventory((current) => current.map((ingredient) => {
        const requirement = requirements.find((entry) => entry.ingredient.id === ingredient.id);
        return requirement ? { ...ingredient, quantity: roundStockQuantity(ingredient.quantity - requirement.quantity) } : ingredient;
      }));
      if (movements.length) setStockMovements((current) => [...movements, ...current]);
      setOrders((current) => current.map((entry) => entry.id === orderId ? {
        ...entry, status, preparedByRole: "kitchen", lines: entry.lines.map((line) => ({ ...line, preparationStatus: line.preparationStatus === "ready" ? "ready" : "preparing", stockConsumed: true })),
      } : entry));
      setStockAlert("");
      return;
    }
    if (status === "ready" && order.lines.some((line) => line.preparationStatus !== "ready")) {
      setStockAlert("La commande ne peut être marquée prête que lorsque chaque article est prêt au poste Cuisine & Bar.");
      return;
    }
    if (status === "cancelled") {
      const reversals = getStockReversalQuantities(stockMovements, orderId).flatMap(({ inventoryItemId, quantity }) => {
        const ingredient = inventory.find((entry) => entry.id === inventoryItemId);
        return ingredient ? [{ ingredient, quantity }] : [];
      });
      if (reversals.length) {
        setInventory((current) => current.map((ingredient) => {
          const reversal = reversals.find((entry) => entry.ingredient.id === ingredient.id);
          return reversal ? { ...ingredient, quantity: roundStockQuantity(ingredient.quantity + reversal.quantity) } : ingredient;
        }));
        const now = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        setStockMovements((current) => [...reversals.map(({ ingredient, quantity }) => ({
          id: "MOV-" + Date.now().toString().slice(-7) + "-REV-" + ingredient.id,
          inventoryItemId: ingredient.id, type: "in" as const, quantity,
          reason: `Annulation · restitution préparation ${order.id}`, createdAt: now,
          source: "sale" as const, reference: order.id,
        })), ...current]);
      }
      const otherOpenBalance = orders.some((entry) => entry.id !== orderId && entry.tableLabel === order.tableLabel && entry.status !== "cancelled" && !entry.closedAt && !entry.closedAtISO);
      if (order.tableLabel !== "À emporter" && !otherOpenBalance) {
        setTables((current) => current.map((table) => table.label === order.tableLabel ? { ...table, status: "available" } : table));
      }
    }
    setOrders((current) => current.map((entry) => entry.id === orderId ? {
      ...entry, status,
      ...(status === "served" ? { servedAtISO: new Date().toISOString(), servedByRole: "server" as const } : {}),
    } : entry));
    if (status === "served" && order.tableLabel !== "À emporter" && (order.closedAt || order.closedAtISO)) {
      const otherOpenBalance = orders.some((entry) => entry.id !== orderId && entry.tableLabel === order.tableLabel && entry.status !== "cancelled" && !entry.closedAt && !entry.closedAtISO);
      if (!otherOpenBalance) setTables((current) => current.map((table) => table.label === order.tableLabel ? { ...table, status: "available" } : table));
    }
  }

  function updateKitchenLineStatus(orderId: string, lineIndex: number, status: import("./domain/types").PreparationStatus) {
    const order = orders.find((entry) => entry.id === orderId);
    const targetLine = order?.lines[lineIndex];
    if (!order || !targetLine || ["served", "cancelled"].includes(order.status) || order.closedAt || order.closedAtISO) return;
    if (!canTransitionPreparationStatus(targetLine.preparationStatus ?? "new", status)) return;
    let nextInventory = inventory;
    let generatedMovements: StockMovement[] = [];
    if (status === "preparing" && !targetLine.stockConsumed) {
      const requirements = inventory.flatMap((ingredient) => {
        const recipe = ingredient.recipes.find((entry) => entry.menuItemId === targetLine.itemId);
        return recipe ? [{ ingredient, quantity: recipe.quantityPerItem * targetLine.quantity }] : [];
      });
      const shortage = requirements.find(({ ingredient, quantity }) => ingredient.quantity < quantity);
      if (shortage) {
        setStockAlert(`Stock insuffisant : ${shortage.ingredient.name}. Disponible : ${shortage.ingredient.quantity} ${shortage.ingredient.unit}, nécessaire : ${shortage.quantity} ${shortage.ingredient.unit}.`);
        return;
      }
      const now = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      nextInventory = inventory.map((ingredient) => {
        const requirement = requirements.find((entry) => entry.ingredient.id === ingredient.id);
        if (!requirement) return ingredient;
        generatedMovements.push({
          id: "MOV-" + Date.now().toString().slice(-7) + "-" + ingredient.id,
          inventoryItemId: ingredient.id, type: "out", quantity: requirement.quantity,
          reason: `Consommation préparation · ${targetLine.name}`, createdAt: now,
          source: "sale", reference: orderId,
        });
        return { ...ingredient, quantity: roundStockQuantity(Math.max(0, ingredient.quantity - requirement.quantity)) };
      });
      setInventory(nextInventory);
      if (generatedMovements.length) setStockMovements((current) => [...generatedMovements, ...current]);
    }
    setStockAlert("");
    const lines = order.lines.map((line, index) => {
      if (index !== lineIndex) return line;
      return { ...line, preparationStatus: status, ...(status === "preparing" ? { stockConsumed: true } : {}) };
    });
    const allReady = lines.every((line) => line.preparationStatus === "ready");
    const anyStarted = lines.some((line) => line.preparationStatus === "preparing" || line.preparationStatus === "ready");
    setOrders((current) => current.map((entry) => entry.id === orderId
      ? { ...entry, lines, ...(anyStarted ? { preparedByRole: "kitchen" as const } : {}), ...(allReady ? { readyAtISO: new Date().toISOString() } : {}), status: allReady ? "ready" : anyStarted ? "preparing" : "new" }
      : entry));
  }

  function recordStockMovement(itemId: string, type: StockMovementType, quantity: number, reason: string) {
    const item = inventory.find((entry) => entry.id === itemId);
    if (!canRecordStockMovement(item, type, quantity, reason)) return;
    setInventory((current) => current.map((entry) => entry.id === itemId
      ? { ...entry, quantity: roundStockQuantity(type === "in" ? entry.quantity + quantity : entry.quantity - quantity) }
      : entry));
    setStockMovements((current) => [{
      id: "MOV-" + Date.now().toString().slice(-7), inventoryItemId: itemId, type,
      quantity, reason, createdAt: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      source: "manual",
    }, ...current]);
  }

  function addInventoryItem(item: Omit<InventoryItem, "id" | "recipes">): boolean {
    if (!canCreateInventoryItem(item, inventory)) return false;
    const id = "stock-" + Date.now().toString().slice(-7);
    setInventory((current) => [...current, { ...item, id, recipes: [] }]);
    if (item.quantity > 0) setStockMovements((current) => [{
      id: "MOV-" + Date.now().toString().slice(-7), inventoryItemId: id, type: "in",
      quantity: item.quantity, reason: "Stock initial à la création", createdAt: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      source: "manual",
    }, ...current]);
    return true;
  }

  function updateStockThreshold(itemId: string, threshold: number) {
    if (!canUpdateStockThreshold(inventory.find((item) => item.id === itemId), threshold)) return;
    setInventory((current) => current.map((item) => item.id === itemId ? { ...item, minimumQuantity: threshold } : item));
  }

  function updateStockRecipe(itemId: string, menuItemId: string, quantity: number) {
    if (!canUpdateStockRecipe(inventory.find((item) => item.id === itemId), menuItems.find((item) => item.id === menuItemId), quantity)) return;
    setInventory((current) => current.map((item) => {
      if (item.id !== itemId) return item;
      const exists = item.recipes.some((recipe) => recipe.menuItemId === menuItemId);
      const recipes = quantity === 0
        ? item.recipes.filter((recipe) => recipe.menuItemId !== menuItemId)
        : exists
          ? item.recipes.map((recipe) => recipe.menuItemId === menuItemId ? { ...recipe, quantityPerItem: quantity } : recipe)
          : [...item.recipes, { menuItemId, quantityPerItem: quantity }];
      return { ...item, recipes };
    }));
  }

  function addCustomer(customer: Omit<Customer, "id" | "createdAt" | "points" | "rewardHistory">) {
    setCustomers((current) => [...current, { ...customer, id: "client-" + crypto.randomUUID().slice(0, 8), createdAt: new Date().toISOString().slice(0, 10), points: 0, rewardHistory: [], loyaltyTransactions: [] }]);
  }

  function updateCustomer(updated: Customer) { setCustomers((current) => current.map((customer) => customer.id === updated.id ? updated : customer)); }

  function redeemCustomerReward(customerId: string, rewardId: string): boolean {
    const reward = loyaltyRewards.find((entry) => entry.id === rewardId && entry.active);
    const customer = customers.find((entry) => entry.id === customerId);
    if (!reward || !customer) return false;
    const updated = redeemLoyaltyReward(customer, reward, crypto.randomUUID(), new Date().toISOString());
    if (updated === customer) return false;
    setCustomers((current) => current.map((entry) => entry.id === customerId ? updated : entry));
    return true;
  }

  function recordPayment(orderId: string, payment: import("./domain/types").OrderPayment): boolean {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order || !canRecordPayment(order, payment)) return false;
    const session = payment.method === "cash" ? cashSessions.find((entry) => entry.status === "open") : undefined;
    if (payment.method === "cash" && !session) {
      setStockAlert("Ouvrez une session de caisse avant d’enregistrer un paiement en espèces.");
      return false;
    }
    const nextPaid = paidTotal(order) + payment.amount;
    const paymentWithTimestamp = {
      ...payment,
      paidAtISO: payment.paidAtISO ?? new Date().toISOString(),
      ...(session ? { cashSessionId: session.id } : {}),
    };
    setOrders((current) => current.map((entry) => entry.id === orderId
      ? { ...entry, payments: [...(entry.payments ?? []), paymentWithTimestamp], paymentStatus: nextPaid >= orderTotal(order) ? "paid" : "partial" }
      : entry));
    setStockAlert("");
    return true;
  }

  function recordRefund(orderId: string, paymentId: string, amount: number, reason: string): boolean {
    const order = orders.find((entry) => entry.id === orderId);
    const payment = order?.payments?.find((entry) => entry.id === paymentId);
    const cashSession = payment?.method === "cash" ? cashSessions.find((entry) => entry.status === "open") : undefined;
    const totals = cashSession ? cashSessionTotals(cashSession) : { cashPayments: 0, cashExpenses: 0 };
    const availableCash = cashSession ? calculateExpectedCash(cashSession, totals.cashPayments, totals.cashExpenses, cashMovements) : undefined;
    const refundLimit = currentUserRole === "owner" ? Number.MAX_SAFE_INTEGER : 0;
    if (!canRecordRefund(order, refunds, paymentId, amount, reason, currentUserRole, refundLimit, {}, availableCash) || !order || !payment) {
      setStockAlert(payment?.method === "cash" && !cashSession ? "Ouvrez une caisse avant de rembourser un paiement en espèces." : "Remboursement refusé : vérifiez les droits, le motif, le montant et le solde disponible.");
      return false;
    }
    const now = new Date().toISOString();
    const refund: Refund = {
      id: "REF-" + crypto.randomUUID().slice(0, 8).toUpperCase(), orderId, paymentId, amount,
      method: payment.method, reason: reason.trim(), createdAtISO: now, recordedByRole: currentUserRole,
      status: payment.method === "cash" ? "completed" : "pending",
      ...(cashSession ? { cashSessionId: cashSession.id } : {}),
    };
    const nextRefunds = [refund, ...refunds];
    setRefunds(nextRefunds);
    if (payment.method === "cash" && cashSession) {
      applyLoyaltyRefund(orderId, refund.id, nextRefunds);
      const movement: CashMovement = {
        id: "MOV-" + crypto.randomUUID().slice(0, 8).toUpperCase(), sessionId: cashSession.id,
        type: "out", amount, reason: "Remboursement " + order.id + " · " + reason.trim(),
        createdAtISO: now, recordedByRole: currentUserRole, relatedRefundId: refund.id,
      };
      setCashMovements((current) => [movement, ...current]);
      setOrders((current) => current.map((entry) => entry.id === orderId ? { ...entry, paymentStatus: getOrderPaymentStatus(entry, nextRefunds) } : entry));
    }
    setStockAlert("");
    return true;
  }

  function applyLoyaltyRefund(orderId: string, refundId: string, nextRefunds: Refund[]) {
    const order = orders.find((entry) => entry.id === orderId);
    const customer = findLoyaltyCustomerForOrder(customers, order);
    if (!order || !customer) return;
    const updated = reverseRefundPoints(customer, orderId, orderTotal(order), nextRefunds, refundId, new Date().toISOString());
    if (updated !== customer) setCustomers((current) => current.map((entry) => entry.id === customer.id ? updated : entry));
  }

  function completeRefund(refundId: string): boolean {
    const refund = refunds.find((entry) => entry.id === refundId);
    if (!refund || !canCompleteRefund(refund)) return false;
    const nextRefunds = refunds.map((entry) => entry.id === refundId ? { ...entry, status: "completed" as const } : entry);
    setRefunds(nextRefunds);
    setOrders((current) => current.map((entry) => entry.id === refund.orderId ? { ...entry, paymentStatus: getOrderPaymentStatus(entry, nextRefunds) } : entry));
    applyLoyaltyRefund(refund.orderId, refund.id, nextRefunds);
    return true;
  }

  function cancelRefund(refundId: string): boolean {
    const refund = refunds.find((entry) => entry.id === refundId);
    if (!refund || !canCancelRefund(refund)) return false;
    setRefunds((current) => current.map((entry) => entry.id === refundId ? { ...entry, status: "cancelled" } : entry));
    return true;
  }

  function closeSale(orderId: string): boolean {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order || closedSalesRef.current.has(orderId) || !canCloseSale(order)) return false;
    closedSalesRef.current.add(orderId);
    const total = orderTotal(order);
    const now = new Date();
    const loyaltyCustomer = findLoyaltyCustomerForOrder(customers, order);
    if (loyaltyCustomer) {
      const updated = awardSalePoints(loyaltyCustomer, orderId, total, now.toISOString());
      if (updated !== loyaltyCustomer) setCustomers((clients) => clients.map((client) => client.id === loyaltyCustomer.id ? updated : client));
    }
    setOrders((current) => current.map((entry) => entry.id === orderId
      ? { ...entry, paymentStatus: "paid", closedAt: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), closedAtISO: now.toISOString(), closedByRole: "cashier" as const }
      : entry));
    if (order.tableLabel !== "À emporter") {
      const otherOpenBalance = orders.some((entry) => entry.id !== orderId && entry.tableLabel === order.tableLabel && entry.status !== "cancelled" && !entry.closedAt && !entry.closedAtISO);
      if (!otherOpenBalance && order.status === "served") {
        setTables((current) => current.map((table) => table.label === order.tableLabel ? { ...table, status: "available" } : table));
      }
    }
    return true;
  }

  function updateTableStatus(tableId: string, status: import("./domain/types").TableStatus) {
    const table = tables.find((entry) => entry.id === tableId);
    if (!table) return;
    const hasOpenOrder = orders.some((order) => order.tableLabel === table.label && order.status !== "cancelled" && !order.closedAt && !order.closedAtISO);
    const activeTableReservations = reservations.filter((reservation) => reservation.tableId === tableId && reservationHoldsTable(reservation.status));
    const hasActiveReservation = activeTableReservations.length > 0;
    const canMarkOccupied = activeTableReservations.some((reservation) => ["arrived", "seated"].includes(reservation.status));
    if ((hasOpenOrder && status !== "occupied") || (hasActiveReservation && status !== "reserved" && !(status === "occupied" && canMarkOccupied))) {
      setStockAlert(`La table ${table.label} possède encore une commande non soldée. Elle ne peut pas être libérée, réservée ou mise en nettoyage.`);
      return;
    }
    setTables((current) => current.map((entry) => entry.id === tableId ? { ...entry, status } : entry));
  }

  const currentUserRole: StaffRole = "owner";

  function createStaffShift(input: Pick<StaffShift, "staffId" | "dateISO" | "startTime" | "endTime"> & Partial<Pick<StaffShift, "notes">>): boolean {
    if (!canManageStaff(currentUserRole, "server") || !canCreateShift(input, staff, shifts, new Date().toISOString().slice(0, 10))) return false;
    const shift: StaffShift = { ...input, id: "SHIFT-" + crypto.randomUUID().slice(0, 8).toUpperCase(), status: "scheduled", createdAtISO: new Date().toISOString() };
    setShifts((current) => [...current, shift]);
    return true;
  }

  function checkInStaff(shiftId: string): boolean {
    const shift = shifts.find((entry) => entry.id === shiftId);
    const now = new Date();
    if (!canCheckIn(shift, staff, attendance, now) || !shift) return false;
    const record: AttendanceEntry = { id: "ATT-" + crypto.randomUUID().slice(0, 8).toUpperCase(), staffId: shift.staffId, shiftId, dateISO: shift.dateISO, checkInISO: now.toISOString(), status: attendanceStatusForShift(shift, now.toISOString()) };
    setAttendance((current) => [...current, record]);
    return true;
  }

  function checkOutStaff(attendanceId: string): boolean {
    const record = attendance.find((entry) => entry.id === attendanceId);
    if (!canCheckOut(record) || !record) return false;
    const now = new Date().toISOString();
    setAttendance((current) => current.map((entry) => entry.id === attendanceId ? { ...entry, checkOutISO: now } : entry));
    setShifts((current) => current.map((shift) => shift.id === record.shiftId ? { ...shift, status: "completed" } : shift));
    return true;
  }

  function cancelStaffShift(shiftId: string): boolean {
    const shift = shifts.find((entry) => entry.id === shiftId);
    if (!canManageStaff(currentUserRole, "server") || !canCancelShift(shift, attendance) || !shift) return false;
    setShifts((current) => current.map((entry) => entry.id === shiftId ? { ...entry, status: "cancelled" } : entry));
    return true;
  }

  function addStaffMember(input: Pick<StaffMember, "name" | "role"> & Partial<Pick<StaffMember, "phone" | "email">>): boolean {
    const name = input.name.trim();
    if (!name || name.length > 80 || !canAssignRole(currentUserRole, input.role)) return false;
    if (staff.some((member) => member.name.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr"))) return false;
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return false;
    if (input.phone && !/^\+?[0-9\s-]{8,16}$/.test(input.phone)) return false;
    setStaff((current) => [...current, { id: "STAFF-" + crypto.randomUUID().slice(0, 8).toUpperCase(), name, role: input.role, active: true, phone: input.phone, email: input.email, permissions: {} }]);
    return true;
  }

  function changeStaffRole(staffId: string, nextRole: StaffRole): boolean {
    const member = staff.find((entry) => entry.id === staffId);
    if (!member || !canManageStaff(currentUserRole, member.role) || !canAssignRole(currentUserRole, nextRole)) return false;
    const ceiling = rolePermissionCeiling(nextRole);
    setStaff((current) => current.map((entry) => entry.id === staffId ? {
      ...entry,
      role: nextRole,
      permissions: Object.fromEntries(Object.entries(entry.permissions ?? {}).filter(([permission]) => ceiling.includes(permission as PermissionKey))) as Partial<Record<PermissionKey, boolean>>,
    } : entry));
    return true;
  }

  function changeStaffActive(staffId: string, active: boolean): boolean {
    const member = staff.find((entry) => entry.id === staffId);
    if (!member || !canManageStaff(currentUserRole, member.role)) return false;
    setStaff((current) => current.map((entry) => entry.id === staffId ? { ...entry, active } : entry));
    return true;
  }

  function changeStaffPermission(staffId: string, permission: PermissionKey, enabled: boolean): boolean {
    const member = staff.find((entry) => entry.id === staffId);
    if (!member || !canGrantCustomPermission(currentUserRole, member.role, permission)) return false;
    setStaff((current) => current.map((entry) => entry.id === staffId ? {
      ...entry, permissions: { ...(entry.permissions ?? {}), [permission]: enabled },
    } : entry));
    return true;
  }

  function createPlatformRestaurant(input: Pick<PlatformRestaurant, "name" | "ownerName" | "ownerEmail" | "city" | "country">, planId: string): boolean {
    const name = input.name.trim();
    const ownerName = input.ownerName.trim();
    const ownerEmail = input.ownerEmail.trim().toLowerCase();
    const city = input.city.trim();
    const country = input.country.trim();
    const plan = platformPlans.find((entry) => entry.id === planId && entry.active);
    if (!plan || !validatePlatformRestaurant({ ...input, name, ownerName, ownerEmail, city, country, planId }, platformRestaurants, platformUsers, platformPlans)) return false;
    const now = new Date();
    const restaurantId = "PLAT-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    const restaurant: PlatformRestaurant = {
      id: restaurantId, name, ownerName, ownerEmail, city, country, planName: plan.name,
      status: "trial", userCount: 1, createdAtISO: now.toISOString(), lastActivityISO: now.toISOString(),
    };
    const subscription: PlatformSubscription = {
      id: "SUB-" + crypto.randomUUID().slice(0, 8).toUpperCase(), restaurantId, restaurantName: name,
      planId: plan.id, planName: plan.name, status: "trial", startedAtISO: now.toISOString(),
    };
    const ownerUser: PlatformUser = {
      id: "PU-" + crypto.randomUUID().slice(0, 8).toUpperCase(), name: ownerName, email: ownerEmail,
      role: "owner", restaurantId, active: true,
    };
    setPlatformRestaurants((current) => [restaurant, ...current]);
    setPlatformSubscriptions((current) => [subscription, ...current]);
    setPlatformUsers((current) => [ownerUser, ...current]);
    appendPlatformAudit("Restaurant créé", name, "Espace d’essai créé pour " + ownerName + ".");
    return true;
  }

  function appendPlatformAudit(action: string, target: string, description: string) {
    setPlatformAuditEvents((current) => [{
      id: "AUD-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      actor: "Super Admin", action, target, description, createdAtISO: new Date().toISOString(),
    }, ...current]);
  }

  function changePlatformRestaurantStatus(id: string, status: PlatformRestaurantStatus) {
    const restaurant = platformRestaurants.find((entry) => entry.id === id);
    if (!restaurant || !canChangeRestaurantStatus(restaurant, status)) return;
    setPlatformRestaurants((current) => current.map((entry) => entry.id === id ? { ...entry, status } : entry));
    appendPlatformAudit("Statut restaurant modifié", restaurant.name, "Statut : " + status);
  }

  function changePlatformTicketStatus(id: string, status: PlatformTicketStatus) {
    const ticket = supportTickets.find((entry) => entry.id === id);
    if (!ticket) return;
    setSupportTickets((current) => current.map((entry) => entry.id === id ? { ...entry, status, updatedAtISO: new Date().toISOString() } : entry));
    appendPlatformAudit("Ticket mis à jour", ticket.id, "Nouveau statut : " + status);
  }

  function togglePlatformUser(id: string, active: boolean) {
    const user = platformUsers.find((entry) => entry.id === id);
    if (!user || !canTogglePlatformUser(user, platformUsers, active)) return;
    setPlatformUsers((current) => current.map((entry) => entry.id === id ? { ...entry, active } : entry));
    appendPlatformAudit(active ? "Compte réactivé" : "Compte désactivé", user.email, "Compte plateforme mis à jour.");
  }

  function togglePlatformPlan(id: string, active: boolean) {
    const plan = platformPlans.find((entry) => entry.id === id);
    if (!plan) return;
    setPlatformPlans((current) => current.map((entry) => entry.id === id ? { ...entry, active } : entry));
    appendPlatformAudit(active ? "Offre activée" : "Offre désactivée", plan.name, "Disponibilité commerciale mise à jour.");
  }

  function createSupportGrant(restaurantId: string, reason: string, scope: "read_only" | "limited", durationHours: number): boolean {
    const restaurant = platformRestaurants.find((entry) => entry.id === restaurantId);
    if (!restaurant || !validateSupportGrant(restaurant, reason, scope, durationHours)) return false;
    const now = new Date();
    const grant: SupportAccessGrant = {
      id: "GRANT-" + crypto.randomUUID().slice(0, 8).toUpperCase(), restaurantId, restaurantName: restaurant.name,
      requestedBy: "Super Admin", reason: reason.trim(), scope, startsAtISO: now.toISOString(),
      expiresAtISO: new Date(now.getTime() + durationHours * 60 * 60 * 1000).toISOString(), status: "pending",
    };
    setSupportAccessGrants((current) => [grant, ...current]);
    appendPlatformAudit("Demande d’accès support", restaurant.name, reason.trim());
    return true;
  }

  function reviewSupportGrant(id: string, action: "approve" | "revoke") {
    const grant = supportAccessGrants.find((entry) => entry.id === id);
    if (!grant || !canReviewSupportGrant(grant, action)) return;
    const now = new Date();
    const durationMs = new Date(grant.expiresAtISO).getTime() - new Date(grant.startsAtISO).getTime();
    setSupportAccessGrants((current) => current.map((entry) => entry.id === id ? {
      ...entry, status: action === "approve" ? "active" : "revoked",
      ...(action === "approve" ? { startsAtISO: now.toISOString(), expiresAtISO: new Date(now.getTime() + durationMs).toISOString() } : {}),
    } : entry));
    appendPlatformAudit(action === "approve" ? "Accès support approuvé" : "Accès support révoqué", grant.restaurantName, grant.reason);
  }

  function addSupplier(input: Pick<Supplier, "name"> & Partial<Pick<Supplier, "contactName" | "phone" | "email" | "address">>): boolean {
    const name = input.name.trim();
    if (!name || name.length > 100 || suppliers.some((supplier) => supplier.name.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr"))) return false;
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return false;
    if (input.phone && !/^\+?[0-9\s-]{8,16}$/.test(input.phone)) return false;
    setSuppliers((current) => [...current, { id: "SUP-" + crypto.randomUUID().slice(0, 8).toUpperCase(), name, contactName: input.contactName?.trim(), phone: input.phone?.trim(), email: input.email?.trim(), address: input.address?.trim(), active: true, createdAtISO: new Date().toISOString() }]);
    return true;
  }

  function createPurchaseOrder(supplierId: string, inputLines: Pick<PurchaseOrderLine, "inventoryItemId" | "quantity" | "unitCost">[], expectedAt?: string, notes?: string): boolean {
    const supplier = suppliers.find((entry) => entry.id === supplierId);
    if (expectedAt) {
      const expectedDay = new Date(expectedAt + "T00:00:00Z");
      const today = new Date().toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedAt) || !Number.isFinite(expectedDay.getTime()) || expectedDay.toISOString().slice(0, 10) !== expectedAt || expectedAt < today) return false;
    }
    if (!canCreatePurchaseOrder(supplier, inventory, inputLines)) return false;
    const lines: PurchaseOrderLine[] = inputLines.map((line) => {
      const item = inventory.find((entry) => entry.id === line.inventoryItemId)!;
      return { ...line, id: "POL-" + crypto.randomUUID().slice(0, 8).toUpperCase(), itemName: item.name, unit: item.unit, receivedQuantity: 0 };
    });
    const order: PurchaseOrder = {
      id: "PO-" + new Date().toISOString().slice(0, 10).replaceAll("-", "") + "-" + crypto.randomUUID().slice(0, 4).toUpperCase(),
      supplierId, supplierName: supplier!.name, createdAtISO: new Date().toISOString(),
      ...(expectedAt ? { expectedAtISO: expectedAt + "T09:00:00+00:00" } : {}),
      status: "ordered", lines, notes,
    };
    setPurchaseOrders((current) => [order, ...current]);
    return true;
  }

  function receivePurchaseOrder(orderId: string, receiptLines: Pick<GoodsReceiptLine, "purchaseOrderLineId" | "quantity">[]): boolean {
    const order = purchaseOrders.find((entry) => entry.id === orderId);
    if (!order || !canReceivePurchaseOrder(order, receiptLines, inventory)) return false;
    const updatedOrder = applyPurchaseReceipt(order, receiptLines);
    const receipt: GoodsReceipt = {
      id: "GR-" + crypto.randomUUID().slice(0, 8).toUpperCase(), purchaseOrderId: order.id,
      receivedAtISO: new Date().toISOString(),
      lines: receiptLines.map((line) => {
        const purchaseLine = order.lines.find((entry) => entry.id === line.purchaseOrderLineId)!;
        return { purchaseOrderLineId: line.purchaseOrderLineId, inventoryItemId: purchaseLine.inventoryItemId, quantity: line.quantity };
      }),
      receivedByRole: currentUserRole,
    };
    if (receipt.lines.some((line) => !inventory.some((item) => item.id === line.inventoryItemId))) return false;
    setPurchaseOrders((current) => current.map((entry) => entry.id === orderId ? updatedOrder : entry));
    setGoodsReceipts((current) => [receipt, ...current]);
    setInventory((current) => current.map((item) => {
      const received = receipt.lines.filter((line) => line.inventoryItemId === item.id).reduce((sum, line) => sum + line.quantity, 0);
      if (!received) return item;
      const unitCost = order.lines.find((line) => line.inventoryItemId === item.id)?.unitCost;
      return { ...item, quantity: roundStockQuantity(item.quantity + received), ...(unitCost !== undefined ? { lastUnitCost: unitCost } : {}) };
    }));
    setStockMovements((current) => [
      ...receipt.lines.map((line) => ({ id: "MOV-" + crypto.randomUUID().slice(0, 8).toUpperCase(), inventoryItemId: line.inventoryItemId, type: "in" as const, quantity: line.quantity, reason: "Réception " + order.id, createdAt: receipt.receivedAtISO, source: "purchase" as const, reference: receipt.id })),
      ...current,
    ]);
    return true;
  }

  function addExpense(input: Pick<Expense, "category" | "description" | "amount" | "method" | "dateISO">): boolean {
    const cashSession = input.method === "cash" ? cashSessions.find((session) => session.status === "open") : undefined;
    if (input.method === "cash" && !cashSession) {
      setStockAlert("Ouvrez une session de caisse avant d’enregistrer une dépense en espèces.");
      return false;
    }
    const totals = cashSession ? cashSessionTotals(cashSession) : { cashPayments: 0, cashExpenses: 0 };
    const availableCash = cashSession ? calculateExpectedCash(cashSession, totals.cashPayments, totals.cashExpenses, cashMovements) : undefined;
    if (!canRecordExpense(input, availableCash)) {
      setStockAlert("La dépense est invalide ou dépasse les espèces disponibles dans la caisse.");
      return false;
    }
    const expense: Expense = { ...input, id: "EXP-" + crypto.randomUUID().slice(0, 8).toUpperCase(), description: input.description.trim(), createdAtISO: new Date().toISOString(), recordedByRole: currentUserRole, ...(cashSession ? { cashSessionId: cashSession.id } : {}) };
    setExpenses((current) => [expense, ...current]);
    setStockAlert("");
    return true;
  }

  function openCashSession(openingBalance: number): boolean {
    if (!canOpenCashSession(cashSessions, openingBalance)) {
      setStockAlert("Une session de caisse est déjà ouverte ou le fond initial est invalide.");
      return false;
    }
    const session: CashSession = { id: "CASH-" + crypto.randomUUID().slice(0, 8).toUpperCase(), openedAtISO: new Date().toISOString(), openedByRole: currentUserRole, openingBalance, status: "open" };
    setCashSessions((current) => [...current, session]);
    setStockAlert("");
    return true;
  }

  function cashSessionTotals(session: CashSession) {
    const cashPayments = orders.reduce((sum, order) => sum + (order.payments ?? []).filter((payment) => payment.method === "cash" && payment.cashSessionId === session.id).reduce((subtotal, payment) => subtotal + payment.amount, 0), 0);
    const cashExpenses = expenses.filter((expense) => expense.method === "cash" && expense.cashSessionId === session.id).reduce((sum, expense) => sum + expense.amount, 0);
    return { cashPayments, cashExpenses };
  }

  function closeCashSession(countedBalance: number): boolean {
    const session = cashSessions.find((entry) => entry.status === "open");
    if (!session) return false;
    const { cashPayments, cashExpenses } = cashSessionTotals(session);
    if (!canCloseCashSession(session, countedBalance, cashPayments, cashExpenses, cashMovements)) {
      setStockAlert("La clôture de caisse n’est pas valide.");
      return false;
    }
    const expectedBalance = calculateExpectedCash(session, cashPayments, cashExpenses, cashMovements);
    const closedAtISO = new Date().toISOString();
    setCashSessions((current) => current.map((entry) => entry.id === session.id ? { ...entry, status: "closed", closedAtISO, closedByRole: currentUserRole, expectedBalance, countedBalance, variance: countedBalance - expectedBalance } : entry));
    setStockAlert("");
    return true;
  }

  function addCashMovement(input: Pick<CashMovement, "type" | "amount" | "reason">): boolean {
    const session = cashSessions.find((entry) => entry.status === "open");
    const movement: CashMovement = { ...input, id: "MOV-" + crypto.randomUUID().slice(0, 8).toUpperCase(), sessionId: session?.id ?? "", reason: input.reason.trim(), createdAtISO: new Date().toISOString(), recordedByRole: currentUserRole };
    if (!session) {
      setStockAlert("Ouvrez une session de caisse avant d’enregistrer un mouvement.");
      return false;
    }
    const totals = cashSessionTotals(session);
    const availableCash = calculateExpectedCash(session, totals.cashPayments, totals.cashExpenses, cashMovements);
    if (!canRecordCashMovement(session, movement, availableCash)) {
      setStockAlert(input.type === "out" ? "La sortie dépasse les espèces disponibles ou le motif est invalide." : "Saisissez un montant positif et un motif valide.");
      return false;
    }
    setCashMovements((current) => [movement, ...current]);
    setStockAlert("");
    return true;
  }

  function createReservation(input: Pick<Reservation, "customerName" | "phone" | "partySize" | "dateISO" | "time" | "durationMinutes"> & Partial<Pick<Reservation, "tableId" | "notes">>): boolean {
    const error = validateReservation(input, tables, reservations, new Date());
    if (error) {
      const messages: Record<string, string> = {
        invalid_input: "Les informations de réservation sont incomplètes ou invalides.",
        customer_name: "Le nom du client est obligatoire (80 caractères maximum).",
        phone: "Le numéro de téléphone est invalide.",
        party_size: "Le nombre de couverts doit être compris entre 1 et 20.",
        duration: "La durée doit être comprise entre 30 et 240 minutes.",
        date: "La date et l’heure doivent être dans le futur.",
        time: "L’heure saisie est invalide.",
        table_not_found: "La table sélectionnée n’existe plus.",
        table_capacity: "La table choisie n’a pas assez de places.",
        table_unavailable: "Cette table est en nettoyage ou indisponible.",
        table_occupied: "Cette table est actuellement occupée.",
        table_conflict: "Une autre réservation chevauche déjà ce créneau sur cette table.",
      };
      setStockAlert(messages[error] ?? "La réservation ne peut pas être enregistrée.");
      return false;
    }
    const now = new Date();
    const table = input.tableId ? tables.find((entry) => entry.id === input.tableId) : undefined;
    const reservation: Reservation = {
      id: "RES-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      customerName: input.customerName.trim(), phone: input.phone.trim(), partySize: input.partySize,
      dateISO: input.dateISO, time: input.time, durationMinutes: input.durationMinutes,
      ...(table ? { tableId: table.id, tableLabel: table.label } : {}),
      status: "pending", notes: input.notes?.trim(), createdAtISO: now.toISOString(),
    };
    setReservations((current) => [reservation, ...current]);
    setStockAlert("");
    return true;
  }

  function updateReservationStatus(reservationId: string, status: ReservationStatus) {
    const reservation = reservations.find((entry) => entry.id === reservationId);
    if (!reservation || !canTransitionReservation(reservation.status, status)) {
      setStockAlert("Cette transition de réservation n’est pas autorisée.");
      return;
    }
    if (status === "confirmed" && reservation.tableId) {
      const validationError = validateReservation(reservation, tables, reservations, new Date());
      if (validationError) {
        setStockAlert(validationError === "table_conflict" ? "Ce créneau est déjà réservé sur cette table." : "La table n’est plus disponible pour confirmer cette réservation.");
        return;
      }
      const hasOpenOrder = orders.some((order) => order.tableLabel === reservation.tableLabel && order.status !== "cancelled" && !order.closedAt && !order.closedAtISO);
      if (hasOpenOrder) {
        setStockAlert("Une commande est encore ouverte sur cette table. Confirmez la réservation après sa clôture ou attribuez une autre table.");
        return;
      }
    }
    const now = new Date().toISOString();
    setReservations((current) => current.map((entry) => entry.id === reservationId ? { ...entry, status, updatedAtISO: now } : entry));
    if (reservation.tableId && status === "confirmed") {
      setTables((current) => current.map((table) => table.id === reservation.tableId && table.status === "available" ? { ...table, status: "reserved" } : table));
    }
    if (reservation.tableId && status === "seated") {
      setTables((current) => current.map((table) => table.id === reservation.tableId ? { ...table, status: "occupied" } : table));
    }
    if (reservation.tableId && ["completed", "cancelled", "no_show"].includes(status)) {
      const anotherReservation = reservations.some((entry) => entry.id !== reservationId && entry.tableId === reservation.tableId && reservationHoldsTable(entry.status));
      const anotherOpenOrder = orders.some((order) => order.tableLabel === reservation.tableLabel && order.status !== "cancelled" && !order.closedAt && !order.closedAtISO);
      if (!anotherReservation && !anotherOpenOrder) setTables((current) => current.map((table) => table.id === reservation.tableId ? { ...table, status: "available" } : table));
    }
    setStockAlert("");
  }

  function assignReservationTable(reservationId: string, tableId: string): boolean {
    const reservation = reservations.find((entry) => entry.id === reservationId);
    if (!reservation || ["cancelled", "no_show", "completed", "seated"].includes(reservation.status)) return false;
    const error = validateReservation({ ...reservation, tableId }, tables, reservations, new Date());
    if (error) {
      setStockAlert(error === "table_conflict" ? "Cette table est déjà réservée sur ce créneau." : "Cette table ne convient pas à cette réservation.");
      return false;
    }
    const table = tables.find((entry) => entry.id === tableId);
    if (!table) return false;
    const hasOpenOrder = orders.some((order) => order.tableLabel === table.label && order.status !== "cancelled" && !order.closedAt && !order.closedAtISO);
    if (hasOpenOrder) {
      setStockAlert("Cette table possède une commande non soldée. Elle ne peut pas être attribuée à une réservation.");
      return false;
    }
    setReservations((current) => current.map((entry) => entry.id === reservationId ? { ...entry, tableId, tableLabel: table.label, updatedAtISO: new Date().toISOString() } : entry));
    if (reservation.tableId && reservation.tableId !== tableId) {
      const otherReservation = reservations.some((entry) => entry.id !== reservationId && entry.tableId === reservation.tableId && reservationHoldsTable(entry.status));
      const otherOrder = orders.some((order) => order.tableLabel === reservation.tableLabel && order.status !== "cancelled" && !order.closedAt && !order.closedAtISO);
      if (!otherReservation && !otherOrder) setTables((current) => current.map((entry) => entry.id === reservation.tableId ? { ...entry, status: "available" } : entry));
    }
    if (["confirmed", "arrived"].includes(reservation.status) && table.status === "available") {
      setTables((current) => current.map((entry) => entry.id === tableId ? { ...entry, status: "reserved" } : entry));
    }
    setStockAlert("");
    return true;
  }

  function addTable(table: Omit<DiningTable, "id" | "status">) {
    setTables((current) => [...current, { ...table, id: "table-" + Date.now(), status: "available" }]);
  }

  function editTable(updated: DiningTable) {
    const currentTable = tables.find((table) => table.id === updated.id);
    if (!currentTable) return;
    if (!canReduceReservationTableCapacity(updated.id, updated.seats, reservations)) {
      setStockAlert("La capacité ne peut pas être réduite sous le nombre de couverts d’une réservation confirmée.");
      return;
    }
    const hasOpenOrder = orders.some((order) => order.tableLabel === currentTable.label && order.status !== "cancelled" && !order.closedAt && !order.closedAtISO);
    if (hasOpenOrder && updated.label !== currentTable.label) {
      setStockAlert("Le nom de cette table ne peut pas changer tant qu’une commande est ouverte.");
      return;
    }
    setTables((current) => current.map((table) => table.id === updated.id ? { ...updated, status: currentTable.status } : table));
    if (updated.label !== currentTable.label) {
      setReservations((current) => current.map((reservation) => reservation.tableId === updated.id ? { ...reservation, tableLabel: updated.label } : reservation));
    }
  }

  function removeTable(tableId: string) {
    const table = tables.find((entry) => entry.id === tableId);
    if (!table) return;
    const hasOpenOrder = orders.some((order) => order.tableLabel === table.label && order.status !== "cancelled" && !order.closedAt && !order.closedAtISO);
    if (!canRemoveReservationTable(tableId, reservations) || hasOpenOrder) {
      setStockAlert("Cette table ne peut pas être supprimée : une réservation active ou une commande non soldée lui est associée.");
      return;
    }
    setTables((current) => current.filter((entry) => entry.id !== tableId));
  }

  const title = mainNavItems.find((item) => item.id === page)?.label ?? (page === "cash" ? "Caisse" : page === "customer" ? "Commande client" : page === "subscription" ? "Abonnement" : page === "purchases" ? "Approvisionnements" : "Tableau de bord");

  if (page === "platform") return <SuperAdminPortal
    restaurants={platformRestaurants}
    plans={platformPlans}
    subscriptions={platformSubscriptions}
    invoices={platformInvoices}
    users={platformUsers}
    tickets={supportTickets}
    auditEvents={platformAuditEvents}
    grants={supportAccessGrants}
    onCreateRestaurant={createPlatformRestaurant}
    onChangeRestaurantStatus={changePlatformRestaurantStatus}
    onChangeTicketStatus={changePlatformTicketStatus}
    onToggleUser={togglePlatformUser}
    onTogglePlan={togglePlatformPlan}
    onCreateGrant={createSupportGrant}
    onReviewGrant={reviewSupportGrant}
    onExit={() => setPage("settings")}
  />;

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Fermer le menu" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Utensils size={20} strokeWidth={2.4} /></div>
          <div><strong>Resto’<span>MAX</span></strong><small>La gestion qui fait avancer votre restaurant</small></div>
          <button className="icon-button sidebar-close" aria-label="Fermer" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>
        </div>
        <div className="nav-caption">PROPRIÉTAIRE</div>
        <nav className="main-nav" aria-label="Navigation principale">
          {mainNavItems.map(({ id, label, icon: Icon, disabled }) => (
            <button key={id} type="button" className={`nav-link ${page === id ? "active" : ""} ${disabled ? "nav-link-disabled" : ""}`} onClick={() => { if (disabled) return; setPage(id); setMobileNavOpen(false); }} disabled={disabled} aria-disabled={disabled || undefined} aria-current={page === id ? "page" : undefined} title={disabled ? "Fonction à raccorder au backend sécurisé" : undefined}>
              <Icon size={18} /><span>{label}</span>
              {id === "orders" && activeOrders.length > 0 && <em>{activeOrders.length}</em>}
              {disabled && <small className="nav-coming-soon">Bientôt</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><Crown size={16}/></div><strong>Forfait Premium</strong><p>Votre restaurant, notre priorité</p><button onClick={() => setPage("subscription")}>Voir détails <ArrowRight size={13}/></button></div>
          <button className="sidebar-restaurant-card" onClick={() => setPage("settings")} aria-label="Ouvrir les informations de Chez Awa">
            <span className="sidebar-restaurant-thumb"><Store size={23}/></span>
            <span className="sidebar-restaurant-info"><strong>{demoRestaurant.name}</strong><span><i/> Ouvert</span><small>{demoRestaurant.city}, Côte d’Ivoire</small></span>
            <ChevronDown size={15}/>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Ouvrir le menu" onClick={() => setMobileNavOpen(true)}><MenuIcon size={21} /></button>
            <div className="breadcrumb">Espace propriétaire <span>/</span> <strong>{title}</strong></div>
            <div className="global-search">
              <Search size={16}/>
              <input ref={searchInputRef} aria-label="Rechercher dans Resto’MAX" placeholder="Rechercher une commande, une table, un produit..." value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setGlobalSearch(""); if (event.key === "Enter" && searchResults[0]) openSearchResult(searchResults[0]); }}/>
              {!globalSearch && <kbd>Ctrl + K</kbd>}
              {globalSearch && <button type="button" aria-label="Effacer la recherche" onClick={() => setGlobalSearch("")}><X size={14}/></button>}
              {globalSearch && <div className="global-search-results" role="listbox" aria-label="Résultats de recherche">
                {searchResults.length ? searchResults.map((result) => <button type="button" role="option" key={result.page + result.id} onClick={() => openSearchResult(result)}><strong>{result.label}</strong><small>{result.detail}</small></button>) : <p>Aucun résultat trouvé.</p>}
              </div>}
            </div>
          </div>
          <div className="topbar-actions"><button className="icon-button notification-button" aria-label="Notifications non disponibles dans la démonstration" title="Notifications non disponibles dans la démonstration" disabled><Bell size={19} /><b /></button><div className="topbar-user"><div className="topbar-avatar">AK</div><div><strong>Awa Koné</strong><small>Propriétaire</small></div><ChevronDown size={14}/></div></div>
        </header>

        <div className="page-content">
          {stockAlert && page !== "kitchen" && page !== "bar" && <div className="inventory-alert" role="alert"><strong>{stockAlert}</strong></div>}
          {page === "overview" && <RestaurantDashboard orders={orders} tables={tables} refunds={refunds} inventory={inventory} cashSessions={cashSessions} reservations={reservations} customers={customers} onNavigate={setPage} />}
          {page === "orders" && <OrdersPage orders={orders} items={menuItems} onStatus={updateOrderStatus} onGoPage={setPage} onGoCash={(orderId) => { setCashTargetOrderId(orderId); setPage("cash"); }} />}
          {page === "menu" && <MenuManagement categories={categories} items={menuItems} options={menuOptions} onCategoriesChange={setCategories} onItemsChange={setMenuItems} onOptionsChange={setMenuOptions} />}
          {page === "customer" && <CustomerOrdering categories={categories} items={menuItems} options={menuOptions} tables={tables} customers={customers} onSubmitOrder={createCustomerOrder} />}
          {page === "kitchen" && <><KitchenBar orders={orders} items={menuItems} onLineStatus={updateKitchenLineStatus} />{stockAlert && <div className="inventory-alert" role="alert"><strong>{stockAlert}</strong></div>}</>}
          {page === "bar" && <><KitchenBar orders={orders} items={menuItems} onLineStatus={updateKitchenLineStatus} stationFilter="drink" />{stockAlert && <div className="inventory-alert" role="alert"><strong>{stockAlert}</strong></div>}</>}
          {page === "cash" && <CashRegister key={cashTargetOrderId ?? "cash-register"} orders={orders} initialSelectedOrderId={cashTargetOrderId} onPayment={recordPayment} onCloseSale={closeSale} />}
          {page === "inventory" && <><InventoryManagement inventory={inventory} items={menuItems} movements={stockMovements} onMovement={recordStockMovement} onAddIngredient={addInventoryItem} onUpdateThreshold={updateStockThreshold} onUpdateRecipe={updateStockRecipe} /><PurchasingManagement suppliers={suppliers} orders={purchaseOrders} inventory={inventory} receipts={goodsReceipts} onAddSupplier={addSupplier} onCreateOrder={createPurchaseOrder} onReceiveOrder={receivePurchaseOrder} /></>}
          {page === "tables" && <TablesManagement tables={tables} onAdd={addTable} onEdit={editTable} onRemove={removeTable} onStatus={updateTableStatus} />}
          {page === "customers" && <CustomerManagement customers={customers} orders={orders} rewards={loyaltyRewards} onAdd={addCustomer} onUpdate={updateCustomer} onRedeem={redeemCustomerReward} />}
          {page === "reports" && <ReportsStatistics orders={orders} staff={staff} reservations={reservations} shifts={shifts} attendance={attendance} refunds={refunds} />}
          {(page === "team" || page === "roles") && <TeamManagement key={page} initialTab={page === "roles" ? ("permissions" as const) : ("members" as const)} staff={staff} currentUserRole={currentUserRole} onAdd={addStaffMember} onRoleChange={changeStaffRole} onActiveChange={changeStaffActive} onPermissionChange={changeStaffPermission} shifts={shifts} attendance={attendance} onCreateShift={createStaffShift} onCheckIn={checkInStaff} onCheckOut={checkOutStaff} onCancelShift={cancelStaffShift} />}
          {page === "settings" && <SettingsPage onPreviewPlatform={() => setPage("platform")} />}
          {page === "subscription" && <SubscriptionManagement />}
          {page === "reservations" && <><ReservationsManagement reservations={reservations} tables={tables} onCreate={createReservation} onStatus={updateReservationStatus} onAssign={assignReservationTable} /><TablesManagement tables={tables} onAdd={addTable} onEdit={editTable} onRemove={removeTable} onStatus={updateTableStatus} /></>}
          {page === "finance" && <FinanceManagement orders={orders} expenses={expenses} sessions={cashSessions} movements={cashMovements} refunds={refunds} onAddExpense={addExpense} onOpenSession={openCashSession} onCloseSession={closeCashSession} onAddMovement={addCashMovement} onRecordRefund={recordRefund} onCompleteRefund={completeRefund} onCancelRefund={cancelRefund} />}
          {page === "purchases" && <PurchasingManagement suppliers={suppliers} orders={purchaseOrders} inventory={inventory} receipts={goodsReceipts} onAddSupplier={addSupplier} onCreateOrder={createPurchaseOrder} onReceiveOrder={receivePurchaseOrder} />}
          <footer className="page-footer"><span>Resto’MAX · Démonstration fonctionnelle</span><span>Version 0.1.0 · Données locales de démonstration</span></footer>
        </div>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`status-pill status-${status}`}><i />{ORDER_STATUS_LABELS[status]}</span>;
}

function OrdersPage({ orders, items, onStatus, onGoPage, onGoCash }: { orders: RestaurantOrder[]; items: MenuItem[]; onStatus: (id: string, status: OrderStatus) => void; onGoPage: (page: Page) => void; onGoCash: (orderId: string) => void }) {
  return <><PageHeading eyebrow="EXPLOITATION" title="Commandes" description="Centralisez les commandes sur place et à emporter, de la réception au service." action={<span className="live-indicator"><i /> Actualisation locale</span>} />
    <div className="panel"><div className="panel-heading"><div><h2>Flux des commandes</h2><p>{orders.length} commande(s) dans le jeu de démonstration.</p></div><span className="demo-tag">DÉMO</span></div>
      <div className="order-cards">{orders.map((order) => <article className="order-card" key={order.id}><div className="order-card-top"><div><strong className="order-id">{order.id}</strong><span className="order-time">{order.createdAt} · {order.tableLabel}</span></div><StatusPill status={order.status} /></div><p className="order-customer">{order.customerName}</p><div className="order-lines">{order.lines.map((line, index) => <div key={`${line.itemId}-${index}`}><span>{line.quantity} × {line.name}</span><strong>{money(line.quantity * line.unitPrice)}</strong></div>)}</div><div className="order-card-bottom"><strong>{money(order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0))}</strong><div className="order-controls">{["new", "preparing"].includes(order.status) && <>{order.lines.some((line) => (items.find((item) => item.id === line.itemId)?.type ?? "dish") === "dish") && <button className="button button-small button-quiet" onClick={() => onGoPage("kitchen")}>Cuisine</button>}{order.lines.some((line) => items.find((item) => item.id === line.itemId)?.type === "drink") && <button className="button button-small button-quiet" onClick={() => onGoPage("bar")}>Bar</button>}</>}{order.status === "ready" && <><button className="button button-small button-quiet" onClick={() => onStatus(order.id, "served")}>Servie</button><button className="button button-small button-primary" onClick={() => onGoCash(order.id)}>Ouvrir la caisse</button></>}{order.status === "served" && !order.closedAt && !order.closedAtISO && <button className="button button-small button-primary" onClick={() => onGoCash(order.id)}>Ouvrir la caisse</button>}{canCancelOrder(order) && <button className="button button-small button-quiet" onClick={() => onStatus(order.id, "cancelled")}>Annuler</button>}{(order.closedAt || order.closedAtISO) && <span className="status-pill status-served">Soldée</span>}</div></div></article>)}</div>
    </div>
  </>;
}

function SettingsPage({ onPreviewPlatform }: { onPreviewPlatform: () => void }) {
  return <><PageHeading eyebrow="CONFIGURATION" title="Paramètres" description="Les informations de base de votre établissement." /><div className="settings-grid"><section className="panel settings-card"><div className="settings-icon"><Store size={20} /></div><h2>Établissement</h2><p>Nom et localisation utilisés dans l’espace de démonstration.</p><div className="setting-field"><label>Nom du restaurant</label><strong>{demoRestaurant.name}</strong></div><div className="setting-field"><label>Ville</label><strong>{demoRestaurant.city}</strong></div></section><section className="panel settings-card"><div className="settings-icon"><CircleDollarSign size={20} /></div><h2>Préférences régionales</h2><p>Paramètres par défaut pour la Côte d’Ivoire.</p><div className="setting-field"><label>Devise</label><strong>Franc CFA (XOF)</strong></div><div className="setting-field"><label>Fuseau horaire</label><strong>Africa/Abidjan (UTC+0)</strong></div></section></div><div className="notice-box"><strong>Configuration de démonstration</strong><p>Les paramètres sont actuellement en lecture seule. La connexion à une base de données et la gestion des comptes seront traitées dans une phase ultérieure.</p><button className="button button-secondary" onClick={onPreviewPlatform}>Ouvrir l’aperçu Super-admin (démo)</button></div></>;
}

export default App;