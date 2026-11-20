const TENANT_PERMISSIONS = [
  "orders.view", "orders.create", "orders.cancel", "payments.collect", "payments.refund",
  "menu.view", "menu.manage", "menu.price", "tables.manage", "reservations.manage",
  "kitchen.manage", "inventory.view", "inventory.manage", "reports.view", "finance.view",
  "finance.manage", "staff.manage", "settings.manage",
];

const ROLE_CEILINGS = {
  owner: TENANT_PERMISSIONS,
  manager: ["orders.view", "orders.create", "orders.cancel", "payments.collect", "payments.refund", "menu.view", "menu.manage", "menu.price", "tables.manage", "reservations.manage", "kitchen.manage", "inventory.view", "inventory.manage", "reports.view", "finance.view", "staff.manage"],
  cashier: ["orders.view", "orders.create", "orders.cancel", "payments.collect", "payments.refund", "menu.view", "tables.manage", "reservations.manage"],
  server: ["orders.view", "orders.create", "menu.view", "tables.manage", "reservations.manage"],
  kitchen: ["orders.view", "menu.view", "kitchen.manage", "inventory.view"],
};

const DEFAULT_PERMISSIONS = {
  owner: TENANT_PERMISSIONS,
  manager: ROLE_CEILINGS.manager,
  cashier: ["orders.view", "orders.create", "payments.collect", "menu.view"],
  server: ["orders.view", "orders.create", "menu.view", "tables.manage", "reservations.manage"],
  kitchen: ["orders.view", "menu.view", "kitchen.manage", "inventory.view"],
};

export function rolePermissionCeiling(role) {
  return [...(ROLE_CEILINGS[role] ?? [])];
}

export function hasPermission(role, permission, overrides = {}) {
  if (role === "owner") return TENANT_PERMISSIONS.includes(permission);
  const ceiling = ROLE_CEILINGS[role] ?? [];
  if (!ceiling.includes(permission)) return false;
  if (overrides[permission] === false) return false;
  if (overrides[permission] === true) return true;
  return (DEFAULT_PERMISSIONS[role] ?? []).includes(permission);
}

export function canManageStaff(actorRole, targetRole) {
  if (actorRole === "owner") return targetRole !== "owner";
  if (actorRole === "manager") return ["cashier", "server", "kitchen"].includes(targetRole);
  return false;
}

export function canAssignRole(actorRole, nextRole) {
  if (actorRole === "owner") return ["manager", "cashier", "server", "kitchen"].includes(nextRole);
  if (actorRole === "manager") return ["cashier", "server", "kitchen"].includes(nextRole);
  return false;
}

export function canGrantCustomPermission(actorRole, targetRole, permission) {
  return actorRole === "owner" && targetRole !== "owner" && (ROLE_CEILINGS[targetRole] ?? []).includes(permission);
}

export function canRefund(role, amount, limit, overrides = {}) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(limit) || limit < 0) return false;
  return hasPermission(role, "payments.refund", overrides) && amount <= limit;
}
