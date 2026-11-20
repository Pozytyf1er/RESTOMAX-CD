import test from "node:test";
import assert from "node:assert/strict";
import { applyPurchaseReceipt, canCreatePurchaseOrder, canReceivePurchaseOrder, purchaseOrderTotal } from "../src/domain/purchasing.js";

const inventory = [{ id: "rice", name: "Riz", unit: "kg", quantity: 10, minimumQuantity: 1, recipes: [] }];
const supplier = { id: "supplier-1", name: "Fournisseur", active: true };
const order = {
  id: "PO-1", supplierId: supplier.id, supplierName: supplier.name, createdAtISO: "2026-11-19T08:00:00.000Z",
  status: "ordered",
  lines: [{ id: "line-1", inventoryItemId: "rice", itemName: "Riz", unit: "kg", quantity: 10, receivedQuantity: 0, unitCost: 500 }],
};

test("purchase orders reject inactive suppliers, unknown or duplicate items, and invalid quantities", () => {
  const line = { inventoryItemId: "rice", quantity: 5, unitCost: 500 };
  assert.equal(canCreatePurchaseOrder(supplier, inventory, [line]), true);
  assert.equal(canCreatePurchaseOrder({ ...supplier, active: false }, inventory, [line]), false);
  assert.equal(canCreatePurchaseOrder(supplier, inventory, [{ ...line, inventoryItemId: "missing" }]), false);
  assert.equal(canCreatePurchaseOrder(supplier, inventory, [line, line]), false);
  assert.equal(canCreatePurchaseOrder(supplier, inventory, [{ ...line, quantity: 0 }]), false);
  assert.equal(canCreatePurchaseOrder(supplier, inventory, [{ ...line, quantity: 1.0001 }]), false);
  assert.equal(canCreatePurchaseOrder(supplier, inventory, [{ ...line, unitCost: -1 }]), false);
  assert.equal(canCreatePurchaseOrder(supplier, inventory, [{ ...line, unitCost: 1.5 }]), false);
});

test("purchase totals reject overflow instead of returning Infinity", () => {
  assert.equal(purchaseOrderTotal([{ quantity: 2, unitCost: 500 }]), 1000);
  assert.equal(Number.isNaN(purchaseOrderTotal([{ quantity: 100000, unitCost: Number.MAX_SAFE_INTEGER }])), true);
});

test("receipts reject empty, duplicate, unknown, excessive, and malformed lines", () => {
  assert.equal(canReceivePurchaseOrder(order, [{ purchaseOrderLineId: "line-1", quantity: 2 }], inventory), true);
  assert.equal(canReceivePurchaseOrder(order, [], inventory), false);
  assert.equal(canReceivePurchaseOrder(order, [{ purchaseOrderLineId: "missing", quantity: 2 }], inventory), false);
  assert.equal(canReceivePurchaseOrder(order, [{ purchaseOrderLineId: "line-1", quantity: 11 }], inventory), false);
  assert.equal(canReceivePurchaseOrder(order, [{ purchaseOrderLineId: "line-1", quantity: 2 }, { purchaseOrderLineId: "line-1", quantity: 2 }], inventory), false);
  assert.equal(canReceivePurchaseOrder(order, [{ purchaseOrderLineId: "line-1", quantity: 1.0001 }], inventory), false);
  assert.equal(canReceivePurchaseOrder(order, [{ purchaseOrderLineId: "line-1", quantity: 2 }], []), false);
});

test("receipts cannot reopen completed orders or process corrupted received quantities", () => {
  const receipt = [{ purchaseOrderLineId: "line-1", quantity: 1 }];
  assert.equal(canReceivePurchaseOrder({ ...order, status: "received" }, receipt), false);
  assert.equal(canReceivePurchaseOrder({ ...order, status: "cancelled" }, receipt), false);
  assert.equal(canReceivePurchaseOrder({ ...order, lines: [{ ...order.lines[0], receivedQuantity: -1 }] }, receipt), false);
  assert.equal(canReceivePurchaseOrder({ ...order, lines: [{ ...order.lines[0], receivedQuantity: 11 }] }, receipt), false);
  assert.equal(canReceivePurchaseOrder({ ...order, lines: [{ ...order.lines[0], quantity: 0 }] }, receipt), false);
});

test("partial and final receipts update status and cumulative quantities exactly once", () => {
  const partial = applyPurchaseReceipt(order, [{ purchaseOrderLineId: "line-1", quantity: 4 }]);
  assert.equal(partial.status, "partially_received");
  assert.equal(partial.lines[0].receivedQuantity, 4);
  const complete = applyPurchaseReceipt(partial, [{ purchaseOrderLineId: "line-1", quantity: 6 }]);
  assert.equal(complete.status, "received");
  assert.equal(complete.lines[0].receivedQuantity, 10);
  assert.equal(applyPurchaseReceipt(complete, [{ purchaseOrderLineId: "line-1", quantity: 1 }]), complete);
});
