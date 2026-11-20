import test from "node:test";
import assert from "node:assert/strict";
import { canCloseCashSession, canOpenCashSession, canRecordCashMovement, canRecordExpense, calculateExpectedCash } from "../src/domain/finance.js";

const session = { id: "CASH-1", openedAtISO: "2026-11-19T08:00:00Z", openedByRole: "cashier", openingBalance: 25000, status: "open" };
const movement = (overrides = {}) => ({ id: "MOV-1", sessionId: "CASH-1", type: "in", amount: 5000, reason: "Fond de caisse", createdAtISO: "2026-11-19T09:00:00Z", recordedByRole: "cashier", ...overrides });

test("only one cash session can be open and opening balance must be valid", () => {
  assert.equal(canOpenCashSession([], 25000), true);
  assert.equal(canOpenCashSession([session], 25000), false);
  assert.equal(canOpenCashSession([], -1), false);
  assert.equal(canOpenCashSession([], 12.5), false);
});

test("calculates expected cash from opening float, cash receipts, expenses and movements", () => {
  assert.equal(calculateExpectedCash(session, 40000, 12000, [movement(), movement({ id: "MOV-2", type: "out", amount: 3000 })]), 55000);
});

test("cash session closure requires an open session and a valid counted amount", () => {
  const movements = [movement()];
  assert.equal(canCloseCashSession(session, 30000, 10000, 5000, movements), true);
  assert.equal(canCloseCashSession({ ...session, status: "closed" }, 30000, 10000, 5000, movements), false);
  assert.equal(canCloseCashSession(session, -1, 10000, 5000, movements), false);
  assert.equal(canCloseCashSession(session, 2.5, 10000, 5000, movements), false);
});

test("cash movements require an open session, positive integer amount and reason", () => {
  assert.equal(canRecordCashMovement(session, movement()), true);
  assert.equal(canRecordCashMovement({ ...session, status: "closed" }, movement()), false);
  assert.equal(canRecordCashMovement(session, movement({ amount: 0 })), false);
  assert.equal(canRecordCashMovement(session, movement({ amount: 10.5 })), false);
  assert.equal(canRecordCashMovement(session, movement({ reason: " " })), false);
  assert.equal(canRecordCashMovement(session, movement({ type: "out", amount: 26000 }), 25000), false);
  assert.equal(canRecordCashMovement(session, movement({ type: "out", amount: 25000 }), 25000), true);
});

test("expenses require a supported category, method, description and FCFA amount", () => {
  const expense = { category: "supplies", description: "Achat de légumes", amount: 12000, method: "cash", dateISO: "2026-11-19" };
  assert.equal(canRecordExpense(expense), true);
  assert.equal(canRecordExpense({ ...expense, amount: 0 }), false);
  assert.equal(canRecordExpense({ ...expense, amount: 10.5 }), false);
  assert.equal(canRecordExpense({ ...expense, method: "crypto" }), false);
  assert.equal(canRecordExpense({ ...expense, category: "unknown" }), false);
  assert.equal(canRecordExpense({ ...expense, description: " " }), false);
  assert.equal(canRecordExpense({ ...expense, dateISO: "2026-02-31" }), false);
  assert.equal(canRecordExpense(expense, 10000), false);
  assert.equal(canRecordExpense(expense, 15000), true);
});
