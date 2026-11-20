import { isValidStockQuantity, roundStockQuantity } from "./inventory.js";

function validPurchaseLine(line, inventory) {
  return Boolean(
    line
    && inventory.some((entry) => entry.id === line.inventoryItemId)
    && isValidStockQuantity(line.quantity)
    && Number.isSafeInteger(line.unitCost)
    && line.unitCost >= 0
  );
}

export function canCreatePurchaseOrder(supplier, inventory, lines) {
  if (!supplier?.active || !Array.isArray(inventory) || !Array.isArray(lines) || !lines.length) return false;
  const seen = new Set();
  if (!lines.every((line) => {
    if (!validPurchaseLine(line, inventory) || seen.has(line.inventoryItemId)) return false;
    seen.add(line.inventoryItemId);
    return true;
  })) return false;
  return Number.isSafeInteger(purchaseOrderTotal(lines));
}

export function purchaseOrderTotal(lines) {
  if (!Array.isArray(lines) || !lines.length) return 0;
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
  return Number.isFinite(total) && Number.isSafeInteger(Math.round(total)) ? Math.round(total) : Number.NaN;
}

function validOrderStructure(order) {
  if (!order || !Array.isArray(order.lines) || !order.lines.length) return false;
  const ids = new Set();
  return order.lines.every((line) => {
    if (!line || typeof line.id !== "string" || !line.id || ids.has(line.id)) return false;
    ids.add(line.id);
    return isValidStockQuantity(line.quantity)
      && isValidStockQuantity(line.receivedQuantity, true)
      && line.receivedQuantity <= line.quantity
      && Number.isSafeInteger(line.unitCost)
      && line.unitCost >= 0
      && typeof line.inventoryItemId === "string"
      && Boolean(line.inventoryItemId);
  });
}

export function canReceivePurchaseOrder(order, receiptLines, inventory) {
  if (!validOrderStructure(order)
    || !["ordered", "partially_received"].includes(order.status)
    || !Array.isArray(receiptLines)
    || !receiptLines.length
    || (inventory && !Array.isArray(inventory))) return false;
  const seen = new Set();
  return receiptLines.every((receipt) => {
    if (!receipt || typeof receipt.purchaseOrderLineId !== "string" || seen.has(receipt.purchaseOrderLineId)
      || !isValidStockQuantity(receipt.quantity)) return false;
    const line = order.lines.find((entry) => entry.id === receipt.purchaseOrderLineId);
    if (!line || (inventory && !inventory.some((item) => item.id === line.inventoryItemId))) return false;
    seen.add(receipt.purchaseOrderLineId);
    const remaining = roundStockQuantity(line.quantity - line.receivedQuantity);
    return receipt.quantity <= remaining;
  });
}

export function applyPurchaseReceipt(order, receiptLines) {
  if (!canReceivePurchaseOrder(order, receiptLines)) return order;
  const lines = order.lines.map((line) => {
    const received = receiptLines.find((entry) => entry.purchaseOrderLineId === line.id);
    return received ? { ...line, receivedQuantity: roundStockQuantity(line.receivedQuantity + received.quantity) } : line;
  });
  const allReceived = lines.every((line) => line.receivedQuantity === line.quantity);
  const anyReceived = lines.some((line) => line.receivedQuantity > 0);
  return { ...order, lines, status: allReceived ? "received" : anyReceived ? "partially_received" : "ordered" };
}
