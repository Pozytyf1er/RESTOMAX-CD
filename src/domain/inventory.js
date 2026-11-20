const MAX_QUANTITY = 100000;
const PRECISION = 1000;

export function isValidStockQuantity(value, allowZero = false) {
  return Number.isFinite(value)
    && value <= MAX_QUANTITY
    && (allowZero ? value >= 0 : value > 0)
    && Math.abs(value * PRECISION - Math.round(value * PRECISION)) < 1e-8;
}

export function roundStockQuantity(value) {
  return Math.round((value + Number.EPSILON) * PRECISION) / PRECISION;
}

export function canRecordStockMovement(item, type, quantity, reason) {
  if (!item || !["in", "out"].includes(type) || !isValidStockQuantity(quantity) || !reason?.trim()) return false;
  if (!isValidStockQuantity(item.quantity, true)) return false;
  if (type === "out") return quantity <= item.quantity;
  return isValidStockQuantity(item.quantity + quantity, true);
}

export function canCreateInventoryItem(input, inventory) {
  if (!input || !Array.isArray(inventory)) return false;
  const name = typeof input.name === "string" ? input.name.trim().toLocaleLowerCase("fr") : "";
  const unit = typeof input.unit === "string" ? input.unit.trim().toLocaleLowerCase("fr") : "";
  if (!name || name.length > 100 || !unit || unit.length > 20) return false;
  if (!isValidStockQuantity(input.quantity, true) || !isValidStockQuantity(input.minimumQuantity, true)) return false;
  return !inventory.some((item) => item.name.trim().toLocaleLowerCase("fr") === name && item.unit.trim().toLocaleLowerCase("fr") === unit);
}

export function canUpdateStockThreshold(item, threshold) {
  return Boolean(item && isValidStockQuantity(threshold, true));
}

export function canUpdateStockRecipe(item, menuItem, quantity) {
  return Boolean(item && menuItem && isValidStockQuantity(quantity, true));
}

export function getStockReversalQuantities(movements, reference) {
  if (!Array.isArray(movements) || typeof reference !== "string" || !reference) return [];
  const totals = new Map();
  for (const movement of movements) {
    if (movement?.source !== "sale" || movement.type !== "out" || movement.reference !== reference
      || !isValidStockQuantity(movement.quantity)) continue;
    totals.set(movement.inventoryItemId, roundStockQuantity((totals.get(movement.inventoryItemId) ?? 0) + movement.quantity));
  }
  return [...totals.entries()].map(([inventoryItemId, quantity]) => ({ inventoryItemId, quantity }));
}
