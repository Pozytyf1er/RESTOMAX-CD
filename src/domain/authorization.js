const ROLE_CEILINGS = Object.freeze({
  owner: ["orders.view","orders.create","orders.cancel","payments.collect","payments.refund","menu.view","menu.manage","menu.price","tables.manage","reservations.manage","kitchen.manage","inventory.view","inventory.manage","reports.view","finance.view","finance.manage","staff.manage","settings.manage"],
  manager: ["orders.view","orders.create","orders.cancel","payments.collect","payments.refund","menu.view","menu.manage","menu.price","tables.manage","reservations.manage","kitchen.manage","inventory.view","inventory.manage","reports.view","finance.view","staff.manage"],
  cashier: ["orders.view","orders.create","payments.collect","payments.refund","menu.view","tables.manage","reservations.manage"],
  server: ["orders.view","orders.create","menu.view","tables.manage","reservations.manage"],
  kitchen: ["orders.view","menu.view","kitchen.manage","inventory.view"],
});

export function isRole(role) {
  return Object.hasOwn(ROLE_CEILINGS, role);
}

const DEFAULT_PERMISSIONS = Object.freeze({
  owner: ROLE_CEILINGS.owner,
  manager: ROLE_CEILINGS.manager,
  cashier: ["orders.view", "orders.create", "payments.collect", "menu.view"],
  server: ["orders.view", "orders.create", "menu.view", "tables.manage", "reservations.manage"],
  kitchen: ["orders.view", "menu.view", "kitchen.manage", "inventory.view"],
});

export function hasServerPermission(membership, permission) {
  if (!membership || membership.active !== true || !isRole(membership.role)) return false;
  if (!ROLE_CEILINGS[membership.role].includes(permission)) return false;
  const override = membership.permissions?.[permission];
  if (override === false) return false;
  if (override === true) return true;
  return DEFAULT_PERMISSIONS[membership.role].includes(permission);
}

export function canManageTargetRole(actorMembership, targetRole) {
  if (!actorMembership || actorMembership.active !== true) return false;
  if (actorMembership.role === "owner") return ["manager","cashier","server","kitchen"].includes(targetRole);
  if (actorMembership.role === "manager") return ["cashier","server","kitchen"].includes(targetRole);
  return false;
}

export function normalizeTenantInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const city = typeof data.city === "string" ? data.city.trim() : "";
  if (name.length < 2 || name.length > 100 || city.length < 2 || city.length > 80) return null;
  return { name, city, currency: "XOF", timezone: "Africa/Abidjan", status: "active" };
}
