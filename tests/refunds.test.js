import test from "node:test";
import assert from "node:assert/strict";
import { canCancelRefund, canCompleteRefund, canRecordRefund, completedRefundTotal, getOrderPaymentStatus, reservedRefundTotal } from "../src/domain/refunds.js";

const order = { id: "CMD-1", tableLabel: "Table 1", customerName: "Awa", createdAt: "2026-11-19", status: "served", lines: [{ itemId: "DISH-1", name: "Plat", quantity: 1, unitPrice: 15000 }], closedAtISO: "2026-11-19T10:00:00Z", paymentStatus: "paid", payments: [{ id: "PAY-CASH", method: "cash", amount: 10000, paidAt: "10:00", paidAtISO: "2026-11-19T10:00:00Z" }, { id: "PAY-MOMO", method: "mobile_money", amount: 5000, paidAt: "10:01", paidAtISO: "2026-11-19T10:01:00Z" }] };
const refunds = [{ id: "REF-1", orderId: "CMD-1", paymentId: "PAY-MOMO", amount: 1000, method: "mobile_money", reason: "Erreur de commande", createdAtISO: "2026-11-19T11:00:00Z", recordedByRole: "owner", status: "pending" }];

test("records refunds only against closed paid sales and existing payment lines", () => {
  assert.equal(canRecordRefund(order, [], "PAY-CASH", 1000, "Article non servi", "owner", 10000, {}, 5000), true);
  assert.equal(canRecordRefund({ ...order, closedAtISO: undefined }, [], "PAY-CASH", 1000, "Article non servi", "owner", 10000, {}, 5000), false);
  assert.equal(canRecordRefund({ ...order, paymentStatus: "unpaid" }, [], "PAY-CASH", 1000, "Article non servi", "owner", 10000, {}, 5000), false);
  assert.equal(canRecordRefund(order, [], "missing", 1000, "Article non servi", "owner", 10000, {}, 5000), false);
});

test("prevents over-refunds including pending refund reservations", () => {
  assert.equal(reservedRefundTotal(refunds, "PAY-MOMO"), 1000);
  assert.equal(canRecordRefund(order, refunds, "PAY-MOMO", 4000, "Erreur de commande", "owner", 10000), true);
  assert.equal(canRecordRefund(order, refunds, "PAY-MOMO", 4001, "Erreur de commande", "owner", 10000), false);
  assert.equal(canRecordRefund(order, [], "PAY-MOMO", 5001, "Erreur de commande", "owner", 10000), false);
});

test("requires cash-session liquidity for cash refunds", () => {
  assert.equal(canRecordRefund(order, [], "PAY-CASH", 5000, "Article non servi", "owner", 10000), false);
  assert.equal(canRecordRefund(order, [], "PAY-CASH", 5000, "Article non servi", "owner", 10000, {}, 4999), false);
  assert.equal(canRecordRefund(order, [], "PAY-CASH", 5000, "Article non servi", "owner", 10000, {}, 5000), true);
});

test("enforces refund permission, amount limit and a reason", () => {
  assert.equal(canRecordRefund(order, [], "PAY-MOMO", 1000, "Article non servi", "owner", 10000), true);
  assert.equal(canRecordRefund(order, [], "PAY-MOMO", 10001, "Article non servi", "owner", 10000), false);
  assert.equal(canRecordRefund(order, [], "PAY-MOMO", 1000, "Court", "owner", 10000), false);
  assert.equal(canRecordRefund(order, [], "PAY-MOMO", 1000, "Article non servi", "server", 10000), false);
});

test("external refunds remain pending until manually confirmed", () => {
  const refund = refunds[0];
  assert.equal(canCompleteRefund(refund), true);
  assert.equal(canCompleteRefund({ ...refund, method: "cash" }), false);
  assert.equal(canCompleteRefund({ ...refund, status: "completed" }), false);
  assert.equal(canCancelRefund(refund), true);
  assert.equal(canCancelRefund({ ...refund, status: "completed" }), false);
});

test("net payment status changes only after completed refunds", () => {
  assert.equal(completedRefundTotal(refunds, "CMD-1"), 0);
  assert.equal(getOrderPaymentStatus(order, refunds), "paid");
  const completed = [{ ...refunds[0], status: "completed", amount: 15000 }];
  assert.equal(completedRefundTotal(completed, "CMD-1"), 15000);
  assert.equal(getOrderPaymentStatus(order, completed), "refunded");
  const partial = [{ ...refunds[0], status: "completed", amount: 2000 }];
  assert.equal(getOrderPaymentStatus(order, partial), "partially_refunded");
});
