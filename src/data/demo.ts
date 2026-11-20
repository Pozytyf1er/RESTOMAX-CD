import type { CashMovement, CashSession, Refund, DiningTable, Expense, GoodsReceipt, InventoryItem, MenuCategory, MenuItem, MenuOption, PurchaseOrder, Reservation, Restaurant, RestaurantOrder, StaffMember, StaffShift, AttendanceEntry, Supplier, PlatformRestaurant, PlatformPlan, PlatformSubscription, PlatformInvoice, PlatformUser, SupportTicket, PlatformAuditEvent, SupportAccessGrant } from "../domain/types";

export const demoRestaurant: Restaurant = {
  id: "restaurant-demo",
  name: "Chez Awa",
  city: "Abidjan",
  currency: "XOF",
  timezone: "Africa/Abidjan",
};

export const demoCategories: MenuCategory[] = [
  { id: "plats", name: "Plats", description: "Les spécialités et plats du restaurant" },
  { id: "grillades", name: "Grillades", description: "Viandes et poissons grillés" },
  { id: "boissons", name: "Boissons", description: "Boissons fraîches et chaudes" },
  { id: "desserts", name: "Desserts", description: "Douceurs et fins de repas" },
];

export const demoMenu: MenuItem[] = [
  { id: "dish-1", categoryId: "plats", type: "dish", name: "Poulet braisé", description: "Poulet mariné, attiéké et oignons", price: 3500, available: true, optionIds: ["choice-attieke", "choice-alloco", "choice-riz", "extra-alloco", "extra-fromage"] },
  { id: "dish-2", categoryId: "plats", type: "dish", name: "Poisson capitaine", description: "Poisson grillé, accompagnement au choix", price: 6000, available: true, optionIds: ["choice-attieke", "choice-alloco", "choice-riz", "extra-alloco", "extra-fromage"] },
  { id: "dish-3", categoryId: "plats", type: "dish", name: "Alloco", description: "Bananes plantain frites", price: 1000, available: true, optionIds: [] },
  { id: "dish-4", categoryId: "grillades", type: "dish", name: "Brochettes de bœuf", description: "Portion de cinq pièces", price: 2500, available: false, optionIds: ["extra-alloco"] },
  { id: "dish-5", categoryId: "boissons", type: "drink", name: "Bissap maison", description: "Jus de bissap frais", price: 700, available: true, optionIds: ["extra-glacons"] },
  { id: "dish-6", categoryId: "boissons", type: "drink", name: "Eau minérale", description: "Bouteille 1,5 L", price: 1000, available: true, optionIds: [] },
];

export const demoMenuOptions: MenuOption[] = [
  { id: "choice-attieke", name: "Attiéké", type: "choice", groupName: "Accompagnement", price: 0, active: true },
  { id: "choice-alloco", name: "Alloco", type: "choice", groupName: "Accompagnement", price: 500, active: true },
  { id: "choice-riz", name: "Riz", type: "choice", groupName: "Accompagnement", price: 0, active: true },
  { id: "extra-alloco", name: "Portion supplémentaire d’alloco", type: "extra", price: 500, active: true },
  { id: "extra-glacons", name: "Glaçons", type: "extra", price: 0, active: true },
  { id: "extra-fromage", name: "Supplément fromage", type: "extra", price: 750, active: true },
];

export const demoTables: DiningTable[] = [
  { id: "table-1", label: "T1", area: "Salle", seats: 2, status: "occupied" },
  { id: "table-2", label: "T2", area: "Salle", seats: 4, status: "occupied" },
  { id: "table-3", label: "T3", area: "Terrasse", seats: 4, status: "reserved" },
  { id: "table-4", label: "T4", area: "Terrasse", seats: 6, status: "occupied" },
  { id: "table-5", label: "T5", area: "Salle", seats: 4, status: "available" },
  { id: "table-6", label: "T6", area: "Salle", seats: 6, status: "available" },
  { id: "table-7", label: "T7", area: "Terrasse", seats: 2, status: "available" },
  { id: "table-8", label: "T8", area: "Bar", seats: 2, status: "available" },
];

export const demoRefunds: Refund[] = [];

export const demoSuppliers: Supplier[] = [
  { id: "SUP-001", name: "Marché d’Adjamé", contactName: "Mariam", phone: "+225 0700000101", address: "Adjamé, Abidjan", active: true, createdAtISO: "2026-10-01T09:00:00+00:00" },
  { id: "SUP-002", name: "Poissonnerie du Port", contactName: "Yao", phone: "+225 0500000202", address: "Treichville, Abidjan", active: true, createdAtISO: "2026-10-03T09:00:00+00:00" },
  { id: "SUP-003", name: "Grossiste Boissons", contactName: "Aïssata", phone: "+225 0100000303", active: true, createdAtISO: "2026-10-05T09:00:00+00:00" },
];

export const demoPurchaseOrders: PurchaseOrder[] = [
  {
    id: "PO-2026-001", supplierId: "SUP-001", supplierName: "Marché d’Adjamé",
    createdAtISO: "2026-11-18T14:30:00+00:00", expectedAtISO: "2026-11-20T09:00:00+00:00",
    status: "ordered", notes: "Livraison avant le service du midi",
    lines: [
      { id: "POL-001", inventoryItemId: "stock-poulet", itemName: "Poulet cru", unit: "kg", quantity: 20, receivedQuantity: 0, unitCost: 2500 },
      { id: "POL-002", inventoryItemId: "stock-plantain", itemName: "Bananes plantain", unit: "kg", quantity: 15, receivedQuantity: 0, unitCost: 800 },
    ],
  },
];

export const demoGoodsReceipts: GoodsReceipt[] = [];

export const demoExpenses: Expense[] = [
  { id: "EXP-20261119-01", category: "supplies", description: "Achat de légumes et condiments", amount: 12000, method: "cash", dateISO: "2026-11-19", createdAtISO: "2026-11-19T09:15:00+00:00", recordedByRole: "owner", cashSessionId: "CASH-20261119-01" },
  { id: "EXP-20261119-02", category: "utilities", description: "Recharge électricité", amount: 5000, method: "mobile_money", dateISO: "2026-11-19", createdAtISO: "2026-11-19T10:00:00+00:00", recordedByRole: "owner" },
];

export const demoCashSessions: CashSession[] = [
  { id: "CASH-20261119-01", openedAtISO: "2026-11-19T08:00:00+00:00", openedByRole: "cashier", openingBalance: 25000, status: "open" },
];

export const demoCashMovements: CashMovement[] = [
  { id: "MOV-20261119-01", sessionId: "CASH-20261119-01", type: "in", amount: 3000, reason: "Complément fond de caisse", createdAtISO: "2026-11-19T08:30:00+00:00", recordedByRole: "cashier" },
  { id: "MOV-20261119-02", sessionId: "CASH-20261119-01", type: "out", amount: 2000, reason: "Petite dépense urgente", createdAtISO: "2026-11-19T10:30:00+00:00", recordedByRole: "cashier" },
];

export const demoReservations: Reservation[] = [
  {
    id: "RES-20261119-01", customerName: "Koffi Yao", phone: "+225 0700000000",
    partySize: 2, dateISO: "2026-11-19", time: "19:00", durationMinutes: 90,
    tableId: "table-3", tableLabel: "T3", status: "confirmed",
    notes: "Préférence terrasse", createdAtISO: "2026-11-19T09:10:00+00:00",
  },
  {
    id: "RES-20261119-02", customerName: "Aminata Coulibaly", phone: "+225 0500000000",
    partySize: 4, dateISO: "2026-11-19", time: "20:30", durationMinutes: 120,
    status: "pending", notes: "Anniversaire", createdAtISO: "2026-11-19T10:25:00+00:00",
  },
];

export const demoOrders: RestaurantOrder[] = [
  {
    id: "CMD-1049", tableLabel: "T5", customerName: "Koffi Yao", createdAt: "12:10",
    createdAtISO: "2026-11-19T12:10:00+00:00", closedAt: "12:48", closedAtISO: "2026-11-19T12:48:00+00:00",
    status: "served", paymentStatus: "paid", preparedByRole: "kitchen", servedByRole: "server", closedByRole: "cashier",
    lines: [
      { itemId: "dish-2", name: "Poisson capitaine", quantity: 2, unitPrice: 6000 },
      { itemId: "dish-1", name: "Poulet braisé", quantity: 1, unitPrice: 3500 },
      { itemId: "dish-3", name: "Alloco", quantity: 1, unitPrice: 1000 },
      { itemId: "dish-5", name: "Bissap maison", quantity: 1, unitPrice: 700 },
    ],
    payments: [
      { id: "PAY-1049-A", method: "cash", amount: 10000, paidAt: "12:46", paidAtISO: "2026-11-19T12:46:00+00:00", cashSessionId: "CASH-20261119-01" },
      { id: "PAY-1049-B", method: "mobile_money", amount: 7200, paidAt: "12:47", paidAtISO: "2026-11-19T12:47:00+00:00", reference: "OM-1049" },
    ],
  },
  {
    id: "CMD-1050", tableLabel: "T2", customerName: "Client sur place", createdAt: "12:55",
    createdAtISO: "2026-11-19T12:55:00+00:00", status: "new", paymentStatus: "unpaid",
    lines: [
      { itemId: "dish-1", name: "Poulet braisé", quantity: 1, unitPrice: 3500, preparationStatus: "new" },
      { itemId: "dish-5", name: "Bissap maison", quantity: 2, unitPrice: 700, preparationStatus: "new" },
    ],
  },
  {
    id: "CMD-1045", tableLabel: "T2", customerName: "Koffi Yao", createdAt: "11:48", createdAtISO: "2026-11-17T11:48:00+00:00", closedAt: "12:36", closedAtISO: "2026-11-17T12:36:00+00:00", status: "served", preparedByRole: "kitchen", servedByRole: "server",
    lines: [{ itemId: "dish-2", name: "Poisson capitaine", quantity: 1, unitPrice: 6000 }, { itemId: "dish-5", name: "Bissap maison", quantity: 1, unitPrice: 700 }],
    payments: [{ id: "PAY-1045", method: "mobile_money", amount: 6700, paidAt: "12:35", reference: "OM-1045" }]
  },
  {
    id: "CMD-1044", tableLabel: "T5", customerName: "Mariam Traoré", createdAt: "13:06", createdAtISO: "2026-11-15T13:06:00+00:00", closedAt: "13:52", closedAtISO: "2026-11-15T13:52:00+00:00", status: "served", preparedByRole: "kitchen", servedByRole: "server",
    lines: [{ itemId: "dish-1", name: "Poulet braisé", quantity: 2, unitPrice: 3500 }],
    payments: [{ id: "PAY-1044", method: "cash", amount: 7000, paidAt: "13:51" }]
  },
  {
    id: "CMD-1043", tableLabel: "À emporter", customerName: "Aminata Coulibaly", createdAt: "12:14", createdAtISO: "2026-11-12T12:14:00+00:00", closedAt: "12:48", closedAtISO: "2026-11-12T12:48:00+00:00", status: "served", preparedByRole: "kitchen",
    lines: [{ itemId: "dish-3", name: "Alloco", quantity: 2, unitPrice: 1000 }, { itemId: "dish-5", name: "Bissap maison", quantity: 2, unitPrice: 700 }],
    payments: [{ id: "PAY-1043", method: "cash", amount: 3400, paidAt: "12:47" }]
  },
  {
    id: "CMD-1042", tableLabel: "T3", customerName: "Jean-Marc N’Guessan", createdAt: "19:05", createdAtISO: "2026-11-09T19:05:00+00:00", closedAt: "20:01", closedAtISO: "2026-11-09T20:01:00+00:00", status: "served", preparedByRole: "kitchen", servedByRole: "server",
    lines: [{ itemId: "dish-1", name: "Poulet braisé", quantity: 1, unitPrice: 3500 }, { itemId: "dish-6", name: "Eau minérale", quantity: 2, unitPrice: 500 }],
    payments: [{ id: "PAY-1042", method: "mobile_money", amount: 4500, paidAt: "20:00", reference: "MOMO-1042" }]
  },
  {
    id: "CMD-1041", tableLabel: "À emporter", customerName: "Fatou Bamba", createdAt: "12:28", createdAtISO: "2026-11-05T12:28:00+00:00", closedAt: "12:44", closedAtISO: "2026-11-05T12:44:00+00:00", status: "served", preparedByRole: "kitchen",
    lines: [{ itemId: "dish-2", name: "Poisson capitaine", quantity: 1, unitPrice: 6000 }],
    payments: [{ id: "PAY-1041", method: "cash", amount: 6000, paidAt: "12:43" }]
  },
  {
    id: "CMD-1040", tableLabel: "T1", customerName: "Koffi Yao", createdAt: "18:40", createdAtISO: "2026-11-01T18:40:00+00:00", closedAt: "19:25", closedAtISO: "2026-11-01T19:25:00+00:00", status: "served", preparedByRole: "kitchen", servedByRole: "server",
    lines: [{ itemId: "dish-1", name: "Poulet braisé", quantity: 1, unitPrice: 3500 }, { itemId: "dish-3", name: "Alloco", quantity: 1, unitPrice: 1000 }, { itemId: "dish-5", name: "Bissap maison", quantity: 2, unitPrice: 700 }],
    payments: [{ id: "PAY-1040", method: "cash", amount: 5900, paidAt: "19:24" }]
  },
  {
    id: "CMD-1039", tableLabel: "T4", customerName: "Aminata Coulibaly", createdAt: "12:02", createdAtISO: "2026-10-25T12:02:00+00:00", closedAt: "12:39", closedAtISO: "2026-10-25T12:39:00+00:00", status: "served", preparedByRole: "kitchen", servedByRole: "server",
    lines: [{ itemId: "dish-2", name: "Poisson capitaine", quantity: 1, unitPrice: 6000 }],
    payments: [{ id: "PAY-1039", method: "mobile_money", amount: 6000, paidAt: "12:38", reference: "OM-1039" }]
  },
  {
    id: "CMD-1038", tableLabel: "À emporter", customerName: "Mariam Traoré", createdAt: "19:12", createdAtISO: "2026-10-20T19:12:00+00:00", closedAt: "19:30", closedAtISO: "2026-10-20T19:30:00+00:00", status: "served", preparedByRole: "kitchen",
    lines: [{ itemId: "dish-3", name: "Alloco", quantity: 3, unitPrice: 1000 }],
    payments: [{ id: "PAY-1038", method: "cash", amount: 3000, paidAt: "19:29" }]
  },

  {
    id: "CMD-1048", tableLabel: "T1", customerName: "Client sur place", createdAt: "12:42", createdAtISO: "2026-11-19T12:42:00+00:00", status: "new", paymentStatus: "unpaid",
    lines: [{ itemId: "dish-1", name: "Poulet braisé", quantity: 1, unitPrice: 3500, preparationStatus: "new" }, { itemId: "dish-5", name: "Bissap maison", quantity: 2, unitPrice: 700, preparationStatus: "new" }],
  },
  {
    id: "CMD-1047", tableLabel: "T4", customerName: "Client QR", createdAt: "12:31", createdAtISO: "2026-11-19T12:31:00+00:00", status: "preparing", paymentStatus: "unpaid", preparedByRole: "kitchen",
    lines: [{ itemId: "dish-2", name: "Poisson capitaine", quantity: 1, unitPrice: 6000, preparationStatus: "preparing" }],
  },
  {
    id: "CMD-1046", tableLabel: "À emporter", customerName: "Aminata Coulibaly", createdAt: "12:18", createdAtISO: "2026-11-19T12:18:00+00:00", status: "ready", paymentStatus: "unpaid", readyAtISO: "2026-11-19T12:34:00+00:00",
    lines: [{ itemId: "dish-3", name: "Alloco", quantity: 2, unitPrice: 1000, preparationStatus: "ready" }],
  },
];


export const demoCustomers: import("../domain/types").Customer[] = [
{id:"client-1",name:"Aminata Coulibaly",phone:"+225 07 08 12 34 56",email:"aminata@example.ci",birthday:"1994-05-12",preferences:"Aime les grillades · Peu épicé",notes:"Préfère la terrasse.",marketingConsent:true,points:145,createdAt:"2025-08-14",rewardHistory:[]},
{id:"client-2",name:"Koffi Yao",phone:"+225 05 44 22 11 09",email:"koffi@example.ci",preferences:"Poisson braisé · Attiéké",notes:"Client fidèle du vendredi.",marketingConsent:true,points:320,createdAt:"2025-04-02",rewardHistory:[{rewardName:"Jus maison offert",redeemedAt:"2026-10-22"}]},
{id:"client-3",name:"Mariam Traoré",phone:"+225 01 02 03 04 05",email:"mariam@example.ci",preferences:"Plats végétariens",notes:"",marketingConsent:false,points:80,createdAt:"2026-01-18",rewardHistory:[]},
{id:"client-4",name:"Jean-Marc N’Guessan",phone:"+225 07 77 66 55 44",email:"jm.nguessan@example.ci",preferences:"Déjeuner rapide · Eau minérale",notes:"Commande souvent à emporter.",marketingConsent:true,points:510,createdAt:"2024-11-06",rewardHistory:[{rewardName:"Réduction de 1 000 FCFA",redeemedAt:"2026-09-12"}]},
{id:"client-5",name:"Fatou Bamba",phone:"+225 07 09 87 65 43",email:"fatou@example.ci",preferences:"Alloco en accompagnement",notes:"",marketingConsent:false,points:35,createdAt:"2026-06-03",rewardHistory:[]}
];
export const demoLoyaltyRewards: import("../domain/types").LoyaltyReward[] = [
{id:"reward-juice",name:"Jus maison offert",description:"Un bissap ou jus du jour offert.",pointsCost:100,active:true},
{id:"reward-discount",name:"Réduction de 1 000 FCFA",description:"À valoir sur une prochaine addition.",pointsCost:250,active:true},
{id:"reward-dessert",name:"Dessert offert",description:"Un dessert de la carte au choix.",pointsCost:350,active:true},
{id:"reward-meal",name:"Plat du jour offert",description:"Un plat du jour dans la limite de 5 000 FCFA.",pointsCost:700,active:true}
];

export const demoStaff: StaffMember[] = [
  { id: "staff-1", name: "Awa Koné", role: "owner", active: true },
  { id: "staff-2", name: "Moussa Traoré", role: "manager", active: true },
  { id: "staff-3", name: "Fatou Diallo", role: "cashier", active: true },
  { id: "staff-4", name: "Ibrahim Yao", role: "kitchen", active: true },
  { id: "staff-5", name: "Aïssata Kouamé", role: "server", active: true },
];

export const demoPlatformRestaurants: PlatformRestaurant[] = [
  { id: "PLAT-001", name: "Le Palmier Gourmand", ownerName: "Jean Kouassi", ownerEmail: "contact@palmier.ci", city: "Abidjan", country: "Côte d’Ivoire", planName: "Premium", status: "active", userCount: 18, createdAtISO: "2026-07-04T09:00:00+00:00", lastActivityISO: "2026-11-19T12:45:00+00:00", renewalAtISO: "2026-12-04T00:00:00+00:00" },
  { id: "PLAT-002", name: "Chez Bella", ownerName: "Aminata Diallo", ownerEmail: "bella@restaurant.sn", city: "Dakar", country: "Sénégal", planName: "Business", status: "active", userCount: 12, createdAtISO: "2026-08-10T09:00:00+00:00", lastActivityISO: "2026-11-19T11:20:00+00:00", renewalAtISO: "2026-12-10T00:00:00+00:00" },
  { id: "PLAT-003", name: "La Terrasse", ownerName: "Marc Laurent", ownerEmail: "bonjour@laterrasse.fr", city: "Paris", country: "France", planName: "Starter", status: "active", userCount: 7, createdAtISO: "2026-08-22T09:00:00+00:00", lastActivityISO: "2026-11-19T10:30:00+00:00", renewalAtISO: "2026-12-22T00:00:00+00:00" },
  { id: "PLAT-004", name: "Chez Awa", ownerName: "Awa Koné", ownerEmail: "awa@chezawa.ci", city: "Abidjan", country: "Côte d’Ivoire", planName: "Business", status: "active", userCount: 9, createdAtISO: "2026-09-01T09:00:00+00:00", lastActivityISO: "2026-11-19T12:10:00+00:00", renewalAtISO: "2026-12-01T00:00:00+00:00" },
  { id: "PLAT-005", name: "L’Atelier Gourmand", ownerName: "Nadia Mensah", ownerEmail: "nadia@atelier.tg", city: "Lomé", country: "Togo", planName: "Starter", status: "trial", userCount: 4, createdAtISO: "2026-11-12T09:00:00+00:00", lastActivityISO: "2026-11-19T09:20:00+00:00" },
  { id: "PLAT-006", name: "Saveurs du Sud", ownerName: "Paul N’Guessan", ownerEmail: "paul@saveurs.ci", city: "Bouaké", country: "Côte d’Ivoire", planName: "Premium", status: "overdue", userCount: 15, createdAtISO: "2026-05-18T09:00:00+00:00", lastActivityISO: "2026-11-15T14:00:00+00:00", renewalAtISO: "2026-11-15T00:00:00+00:00" },
  { id: "PLAT-007", name: "Le Jardin Bleu", ownerName: "Sophie Traoré", ownerEmail: "sophie@jardin.ci", city: "Yamoussoukro", country: "Côte d’Ivoire", planName: "Business", status: "suspended", userCount: 6, createdAtISO: "2026-04-02T09:00:00+00:00", lastActivityISO: "2026-11-08T15:00:00+00:00" },
];

export const demoPlatformPlans: PlatformPlan[] = [
  { id: "PLAN-STARTER", name: "Starter", description: "Pour démarrer avec les outils essentiels.", maxUsers: 5, maxEstablishments: 1, maxTables: 10, features: ["Menu & QR", "Commandes", "Caisse", "Rapports essentiels"], active: true },
  { id: "PLAN-BUSINESS", name: "Business", description: "Pour les restaurants en croissance.", maxUsers: 15, maxEstablishments: 2, maxTables: 40, features: ["Tout Starter", "Stocks & achats", "Fidélité", "Réservations", "Rapports avancés"], active: true },
  { id: "PLAN-PREMIUM", name: "Premium", description: "Pour les groupes et établissements avancés.", maxUsers: 50, maxEstablishments: 10, maxTables: 200, features: ["Tout Business", "Multi-établissements", "Support prioritaire", "Exports avancés"], active: true },
];

export const demoPlatformSubscriptions: PlatformSubscription[] = [
  { id: "SUB-001", restaurantId: "PLAT-001", restaurantName: "Le Palmier Gourmand", planId: "PLAN-PREMIUM", planName: "Premium", status: "active", startedAtISO: "2026-07-04T09:00:00+00:00", renewsAtISO: "2026-12-04T00:00:00+00:00" },
  { id: "SUB-002", restaurantId: "PLAT-002", restaurantName: "Chez Bella", planId: "PLAN-BUSINESS", planName: "Business", status: "active", startedAtISO: "2026-08-10T09:00:00+00:00", renewsAtISO: "2026-12-10T00:00:00+00:00" },
  { id: "SUB-003", restaurantId: "PLAT-003", restaurantName: "La Terrasse", planId: "PLAN-STARTER", planName: "Starter", status: "active", startedAtISO: "2026-08-22T09:00:00+00:00", renewsAtISO: "2026-12-22T00:00:00+00:00" },
  { id: "SUB-004", restaurantId: "PLAT-004", restaurantName: "Chez Awa", planId: "PLAN-BUSINESS", planName: "Business", status: "active", startedAtISO: "2026-09-01T09:00:00+00:00", renewsAtISO: "2026-12-01T00:00:00+00:00" },
  { id: "SUB-005", restaurantId: "PLAT-005", restaurantName: "L’Atelier Gourmand", planId: "PLAN-STARTER", planName: "Starter", status: "trial", startedAtISO: "2026-11-12T09:00:00+00:00", renewsAtISO: "2026-12-12T00:00:00+00:00" },
  { id: "SUB-006", restaurantId: "PLAT-006", restaurantName: "Saveurs du Sud", planId: "PLAN-PREMIUM", planName: "Premium", status: "overdue", startedAtISO: "2026-05-18T09:00:00+00:00", renewsAtISO: "2026-11-15T00:00:00+00:00" },
];

export const demoPlatformInvoices: PlatformInvoice[] = [
  { id: "INV-001", number: "RM-2026-1101", restaurantId: "PLAT-001", restaurantName: "Le Palmier Gourmand", issuedAtISO: "2026-11-04T09:00:00+00:00", dueAtISO: "2026-11-11T00:00:00+00:00", status: "paid" },
  { id: "INV-002", number: "RM-2026-1102", restaurantId: "PLAT-002", restaurantName: "Chez Bella", issuedAtISO: "2026-11-10T09:00:00+00:00", dueAtISO: "2026-11-17T00:00:00+00:00", status: "paid" },
  { id: "INV-003", number: "RM-2026-1103", restaurantId: "PLAT-006", restaurantName: "Saveurs du Sud", issuedAtISO: "2026-11-15T09:00:00+00:00", dueAtISO: "2026-11-18T00:00:00+00:00", status: "overdue" },
  { id: "INV-004", number: "RM-2026-1104", restaurantId: "PLAT-004", restaurantName: "Chez Awa", issuedAtISO: "2026-11-19T09:00:00+00:00", dueAtISO: "2026-11-26T00:00:00+00:00", status: "pending" },
];

export const demoPlatformUsers: PlatformUser[] = [
  { id: "PU-001", name: "Super Admin", email: "admin@restomax.com", role: "super_admin", active: true, lastLoginAtISO: "2026-11-19T12:00:00+00:00" },
  { id: "PU-002", name: "Support Resto’MAX", email: "support@restomax.com", role: "support", active: true, lastLoginAtISO: "2026-11-19T10:00:00+00:00" },
  { id: "PU-003", name: "Équipe technique", email: "tech@restomax.com", role: "technical", active: true, lastLoginAtISO: "2026-11-18T17:00:00+00:00" },
  { id: "PU-004", name: "Comptabilité", email: "compta@restomax.com", role: "accounting", active: true, lastLoginAtISO: "2026-11-18T15:00:00+00:00" },
  { id: "PU-005", name: "Awa Koné", email: "awa@chezawa.ci", role: "owner", restaurantId: "PLAT-004", active: true, lastLoginAtISO: "2026-11-19T12:10:00+00:00" },
];

export const demoSupportTickets: SupportTicket[] = [
  { id: "#ST-2025-1187", restaurantId: "PLAT-001", restaurantName: "Le Palmier Gourmand", subject: "Problème de paiement", category: "Paiement", priority: "high", status: "in_progress", createdAtISO: "2026-11-19T10:45:00+00:00", updatedAtISO: "2026-11-19T11:20:00+00:00", messagesCount: 4, assignedTo: "Support Resto’MAX" },
  { id: "#ST-2025-1186", restaurantId: "PLAT-004", restaurantName: "Chez Awa", subject: "Accès au tableau de bord", category: "Compte", priority: "normal", status: "open", createdAtISO: "2026-11-19T09:30:00+00:00", updatedAtISO: "2026-11-19T09:30:00+00:00", messagesCount: 2 },
  { id: "#ST-2025-1185", restaurantId: "PLAT-002", restaurantName: "Chez Bella", subject: "Demande d’abonnement", category: "Abonnement", priority: "low", status: "resolved", createdAtISO: "2026-11-18T12:00:00+00:00", updatedAtISO: "2026-11-18T15:00:00+00:00", messagesCount: 3 },
];

export const demoPlatformAuditEvents: PlatformAuditEvent[] = [
  { id: "AUD-001", actor: "Super Admin", action: "Inscription restaurant", target: "Le Palmier Gourmand", createdAtISO: "2026-11-19T13:45:00+00:00", description: "Nouveau compte restaurant créé." },
  { id: "AUD-002", actor: "Super Admin", action: "Mise à jour abonnement", target: "Chez Awa", createdAtISO: "2026-11-19T12:30:00+00:00", description: "Formule Business renouvelée." },
  { id: "AUD-003", actor: "Support Resto’MAX", action: "Ticket ouvert", target: "#ST-2025-1187", createdAtISO: "2026-11-19T11:20:00+00:00", description: "Un ticket de support a été créé." },
  { id: "AUD-004", actor: "Super Admin", action: "Rapport généré", target: "Plateforme", createdAtISO: "2026-11-19T09:15:00+00:00", description: "Rapport mensuel de démonstration généré." },
];

export const demoSupportAccessGrants: SupportAccessGrant[] = [
  { id: "GRANT-001", restaurantId: "PLAT-001", restaurantName: "Le Palmier Gourmand", requestedBy: "Support Resto’MAX", reason: "Diagnostic d’un incident de paiement", scope: "read_only", startsAtISO: "2026-11-19T10:00:00+00:00", expiresAtISO: "2026-11-19T12:00:00+00:00", status: "expired" },
  { id: "GRANT-002", restaurantId: "PLAT-004", restaurantName: "Chez Awa", requestedBy: "Équipe technique", reason: "Vérification d’un problème d’affichage", scope: "read_only", startsAtISO: "2026-11-19T14:00:00+00:00", expiresAtISO: "2026-11-19T15:00:00+00:00", status: "pending" },
];

export const demoShifts: StaffShift[] = [
  { id: "SHIFT-001", staffId: "staff-2", dateISO: "2026-11-19", startTime: "08:00", endTime: "17:00", status: "scheduled", createdAtISO: "2026-11-18T16:00:00+00:00" },
  { id: "SHIFT-002", staffId: "staff-3", dateISO: "2026-11-19", startTime: "08:00", endTime: "16:00", status: "scheduled", createdAtISO: "2026-11-18T16:05:00+00:00" },
  { id: "SHIFT-003", staffId: "staff-4", dateISO: "2026-11-19", startTime: "09:00", endTime: "18:00", status: "scheduled", createdAtISO: "2026-11-18T16:10:00+00:00" },
  { id: "SHIFT-004", staffId: "staff-5", dateISO: "2026-11-19", startTime: "11:00", endTime: "20:00", status: "scheduled", createdAtISO: "2026-11-18T16:15:00+00:00" },
];

export const demoAttendance: AttendanceEntry[] = [
  { id: "ATT-001", staffId: "staff-2", shiftId: "SHIFT-001", dateISO: "2026-11-19", checkInISO: "2026-11-19T08:04:00+00:00", status: "present" },
  { id: "ATT-002", staffId: "staff-3", shiftId: "SHIFT-002", dateISO: "2026-11-19", checkInISO: "2026-11-19T08:17:00+00:00", status: "late" },
  { id: "ATT-003", staffId: "staff-4", shiftId: "SHIFT-003", dateISO: "2026-11-19", checkInISO: "2026-11-19T09:00:00+00:00", status: "present" },
];

export const demoInventory: InventoryItem[] = [
  { id: "stock-poulet", name: "Poulet cru", unit: "kg", quantity: 18, minimumQuantity: 5, recipes: [{ menuItemId: "dish-1", quantityPerItem: 0.35 }] },
  { id: "stock-capitaine", name: "Poisson capitaine", unit: "kg", quantity: 12, minimumQuantity: 4, recipes: [{ menuItemId: "dish-2", quantityPerItem: 0.45 }] },
  { id: "stock-plantain", name: "Bananes plantain", unit: "kg", quantity: 22, minimumQuantity: 6, recipes: [{ menuItemId: "dish-3", quantityPerItem: 0.3 }, { menuItemId: "dish-1", quantityPerItem: 0.2 }] },
  { id: "stock-bissap", name: "Fleurs d’hibiscus", unit: "kg", quantity: 3.5, minimumQuantity: 1, recipes: [{ menuItemId: "dish-5", quantityPerItem: 0.025 }] },
  { id: "stock-eau", name: "Eau minérale (bouteilles)", unit: "unité", quantity: 48, minimumQuantity: 12, recipes: [{ menuItemId: "dish-6", quantityPerItem: 1 }] },
  { id: "stock-attieke", name: "Attiéké", unit: "kg", quantity: 8, minimumQuantity: 3, recipes: [] },
];
