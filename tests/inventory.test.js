import test from "node:test";
import assert from "node:assert/strict";
import {
  canCreateInventoryItem,
  canRecordStockMovement,
  canUpdateStockRecipe,
  canUpdateStockThreshold,
  isValidStockQuantity,
  roundStockQuantity,
  getStockReversalQuantities,
} from "../src/domain/inventory.js";

const item = { id: "rice", name: "Riz", unit: "kg", quantity: 12.5, minimumQuantity: 2, recipes: [] };

test("stock quantities accept zero only where allowed and at most three decimals", () => {
  assert.equal(isValidStockQuantity(0), false);
  assert.equal(isValidStockQuantity(0, true), true);
  assert.equal(isValidStockQuantity(0.125), true);
  assert.equal(isValidStockQuantity(0.0001), false);
  assert.equal(isValidStockQuantity(-1, true), false);
  assert.equal(isValidStockQuantity(Infinity, true), false);
  assert.equal(isValidStockQuantity(100001, true), false);
});

test("manual movements reject missing data, invalid precision, and insufficient stock", () => {
  assert.equal(canRecordStockMovement(item, "out", 12.5, "Perte"), true);
  assert.equal(canRecordStockMovement(item, "out", 12.501, "Perte"), false);
  assert.equal(canRecordStockMovement(item, "out", 12.5001, "Perte"), false);
  assert.equal(canRecordStockMovement(item, "out", 1, " "), false);
  assert.equal(canRecordStockMovement(item, "in", 0, "Achat"), false);
  assert.equal(canRecordStockMovement(item, "in", 100000, "Achat"), false);
});

test("stock item creation rejects duplicate normalized names and invalid initial values", () => {
  const base = { name: "  Riz ", unit: " KG ", quantity: 0, minimumQuantity: 1 };
  assert.equal(canCreateInventoryItem(base, [item]), false);
  assert.equal(canCreateInventoryItem({ ...base, name: "Huile" }, [item]), true);
  assert.equal(canCreateInventoryItem({ ...base, name: "Huile", quantity: -1 }, [item]), false);
  assert.equal(canCreateInventoryItem({ ...base, name: "Huile", minimumQuantity: 0.0001 }, [item]), false);
});

test("threshold and recipe updates require existing targets and valid quantities", () => {
  const menuItem = { id: "dish-1" };
  assert.equal(canUpdateStockThreshold(item, 0), true);
  assert.equal(canUpdateStockThreshold(item, -1), false);
  assert.equal(canUpdateStockThreshold(undefined, 1), false);
  assert.equal(canUpdateStockRecipe(item, menuItem, 0), true);
  assert.equal(canUpdateStockRecipe(item, menuItem, 0.25), true);
  assert.equal(canUpdateStockRecipe(item, menuItem, -0.25), false);
  assert.equal(canUpdateStockRecipe(item, undefined, 0.25), false);
});

test("stock rounding prevents floating point residue", () => {
  assert.equal(roundStockQuantity(0.1 + 0.2), 0.3);
});

test("stock reversal totals only preparation outflows for the cancelled order", () => {
  const movements = [
    { inventoryItemId: "rice", type: "out", source: "sale", reference: "ORDER-1", quantity: 0.25 },
    { inventoryItemId: "rice", type: "out", source: "sale", reference: "ORDER-1", quantity: 0.5 },
    { inventoryItemId: "oil", type: "out", source: "sale", reference: "ORDER-1", quantity: 0.1 },
    { inventoryItemId: "rice", type: "in", source: "sale", reference: "ORDER-1", quantity: 1 },
    { inventoryItemId: "rice", type: "out", source: "manual", reference: "ORDER-1", quantity: 2 },
    { inventoryItemId: "rice", type: "out", source: "sale", reference: "ORDER-2", quantity: 4 },
  ];
  assert.deepEqual(getStockReversalQuantities(movements, "ORDER-1"), [
    { inventoryItemId: "rice", quantity: 0.75 },
    { inventoryItemId: "oil", quantity: 0.1 },
  ]);
});
