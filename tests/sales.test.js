import test from "node:test";
import assert from "node:assert/strict";
import { canCancelOrder, canCloseSale, canOrderAtTableStatus, canRecordPayment, isSaleEligibleForRevenue, orderTotal, paidTotal } from "../src/domain/sales.js";

const readyOrder = (overrides = {}) => ({
  id: "CMD-TEST",
  tableLabel: "T1",
  customerName: "Client test",
  createdAt: "12:00",
  status: "ready",
  lines: [{ itemId: "dish-1", name: "Poulet braisé", quantity: 2, unitPrice: 3500 }],
  payments: [],
  ...overrides,
});

test("calculates order total and cumulative payments", () => {
  const order = readyOrder({ payments: [
    { id: "P1", method: "cash", amount: 2000, paidAt: "12:01" },
    { id: "P2", method: "mobile_money", amount: 5000, paidAt: "12:02" },
  ] });
  assert.equal(orderTotal(order), 7000);
  assert.equal(paidTotal(order), 7000);
});

test("accepts a valid partial payment but rejects overpayment", () => {
  const order = readyOrder();
  assert.equal(canRecordPayment(order, { id: "P1", method: "cash", amount: 3000, paidAt: "12:01" }), true);
  assert.equal(canRecordPayment(order, { id: "P2", method: "cash", amount: 7001, paidAt: "12:01" }), false);
});

test("rejects invalid, fractional, duplicate and non-positive payments", () => {
  const order = readyOrder({ payments: [{ id: "P1", method: "cash", amount: 1000, paidAt: "12:01" }] });
  assert.equal(canRecordPayment(order, { id: "P1", method: "cash", amount: 1000, paidAt: "12:02" }), false);
  assert.equal(canRecordPayment(order, { id: "P2", method: "cash", amount: 0, paidAt: "12:02" }), false);
  assert.equal(canRecordPayment(order, { id: "P3", method: "cash", amount: 100.5, paidAt: "12:02" }), false);
  assert.equal(canRecordPayment(order, { id: "P4", method: "card", amount: 1000, paidAt: "12:02" }), true);
  assert.equal(canRecordPayment(order, { id: "P5", method: "other", amount: 1000, paidAt: "12:02" }), true);
  assert.equal(canRecordPayment(order, { id: "P6", method: "crypto", amount: 1000, paidAt: "12:02" }), false);
});

test("allows payment before or after service but rejects preparation and closed orders", () => {
  const payment = { id: "P1", method: "cash", amount: 1000, paidAt: "12:01" };
  assert.equal(canRecordPayment(readyOrder({ status: "preparing" }), payment), false);
  assert.equal(canRecordPayment(readyOrder({ status: "served" }), payment), true);
  assert.equal(canRecordPayment(readyOrder({ closedAtISO: "2026-11-19T12:00:00Z" }), payment), false);
});

test("only a fully paid and closed non-cancelled order contributes to revenue", () => {
  const paidAndClosed = readyOrder({
    status: "served",
    closedAtISO: "2026-11-19T12:30:00Z",
    payments: [{ id: "P1", method: "cash", amount: 7000, paidAt: "12:29" }],
  });
  assert.equal(isSaleEligibleForRevenue(paidAndClosed), true);
  assert.equal(isSaleEligibleForRevenue(readyOrder({ status: "ready", closedAtISO: "2026-11-19T12:30:00Z", payments: [{ id: "P1", method: "cash", amount: 7000, paidAt: "12:29" }] })), true);
  assert.equal(isSaleEligibleForRevenue({ ...paidAndClosed, payments: [] }), false);
  assert.equal(isSaleEligibleForRevenue({ ...paidAndClosed, status: "cancelled" }), false);
});

test("sale can only be closed when fully paid and ready or served", () => {
  assert.equal(canCloseSale(readyOrder({ payments: [{ id: "P1", method: "cash", amount: 7000, paidAt: "12:01" }] })), true);
  assert.equal(canCloseSale(readyOrder()), false);
  assert.equal(canCloseSale(readyOrder({ status: "served", payments: [{ id: "P1", method: "cash", amount: 7000, paidAt: "12:01" }] })), true);
  assert.equal(canCloseSale(readyOrder({ status: "served", closedAt: "12:10", payments: [{ id: "P1", method: "cash", amount: 7000, paidAt: "12:01" }] })), false);
});

test("cancellation is blocked after service, payment or closure", () => {
  assert.equal(canCancelOrder(readyOrder()), true);
  assert.equal(canCancelOrder(readyOrder({ payments: [{ id: "P1", method: "cash", amount: 1000, paidAt: "12:01" }] })), false);
  assert.equal(canCancelOrder(readyOrder({ status: "served" })), false);
  assert.equal(canCancelOrder(readyOrder({ closedAtISO: "2026-11-19T12:00:00Z" })), false);
});

test("allows follow-up orders at occupied tables but not reserved or unavailable tables", () => {
  assert.equal(canOrderAtTableStatus("available"), true);
  assert.equal(canOrderAtTableStatus("occupied"), true);
  assert.equal(canOrderAtTableStatus("reserved"), false);
  assert.equal(canOrderAtTableStatus("cleaning"), false);
  assert.equal(canOrderAtTableStatus("unavailable"), false);
});
