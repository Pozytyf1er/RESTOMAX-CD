import test from "node:test";
import assert from "node:assert/strict";
import {
  awardSalePoints, canRedeemLoyaltyReward, findLoyaltyCustomerForOrder,
  normalizeCustomerName, redeemLoyaltyReward, reverseRefundPoints,
} from "../src/domain/loyalty.js";

const customer = (overrides = {}) => ({
  id: "client-1", name: "Aminata Coulibaly", phone: "+2250708123456",
  email: "", preferences: "", notes: "", marketingConsent: false,
  points: 0, createdAt: "2026-01-01", rewardHistory: [], ...overrides,
});
const reward = { id: "reward-1", name: "Jus offert", description: "", pointsCost: 100, active: true };

test("normalizes accents, case and repeated spaces in customer names", () => {
  assert.equal(normalizeCustomerName("  ÉLODIE   TRAORÉ "), "elodie traore");
});

test("resolves an order by stable customer id before considering its name", () => {
  const first = customer();
  const second = customer({ id: "client-2", name: "Aminata Coulibaly" });
  assert.equal(findLoyaltyCustomerForOrder([first, second], { customerId: "client-2", customerName: first.name }), second);
});

test("does not guess when a legacy order name matches multiple customers", () => {
  const first = customer();
  const second = customer({ id: "client-2" });
  assert.equal(findLoyaltyCustomerForOrder([first, second], { customerName: first.name }), undefined);
});

test("awards one point per 1,000 XOF and is idempotent per sale", () => {
  const first = awardSalePoints(customer(), "CMD-1", 2599, "2026-11-19T10:00:00.000Z");
  const repeated = awardSalePoints(first, "CMD-1", 2599, "2026-11-19T10:01:00.000Z");
  assert.equal(first.points, 2);
  assert.equal(repeated.points, 2);
  assert.equal(repeated.loyaltyTransactions.length, 1);
});

test("does not award points for invalid or zero-value sales", () => {
  assert.equal(awardSalePoints(customer(), "CMD-1", 0).points, 0);
  assert.equal(awardSalePoints(customer(), "CMD-1", 1.5).points, 0);
});

test("reverses points cumulatively across partial refunds without rounding each refund separately", () => {
  let client = awardSalePoints(customer(), "CMD-2", 4500);
  client = reverseRefundPoints(client, "CMD-2", 4500, [
    { id: "REF-1", orderId: "CMD-2", amount: 600, status: "completed" },
  ], "REF-1");
  assert.equal(client.points, 4);
  client = reverseRefundPoints(client, "CMD-2", 4500, [
    { id: "REF-1", orderId: "CMD-2", amount: 600, status: "completed" },
    { id: "REF-2", orderId: "CMD-2", amount: 1500, status: "completed" },
  ], "REF-2");
  assert.equal(client.points, 2);
  const repeated = reverseRefundPoints(client, "CMD-2", 4500, [
    { id: "REF-1", orderId: "CMD-2", amount: 600, status: "completed" },
    { id: "REF-2", orderId: "CMD-2", amount: 1500, status: "completed" },
  ], "REF-2");
  assert.equal(repeated.points, 2);
  assert.equal(client.loyaltyTransactions.filter((entry) => entry.type === "refund_reversal").reduce((sum, entry) => sum + Math.abs(entry.points), 0), 2);
});

test("caps refund reversal at points originally earned and records a debt if points were spent", () => {
  let client = awardSalePoints(customer(), "CMD-3", 2500);
  client = redeemLoyaltyReward(client, { ...reward, pointsCost: 1 }, "RED-1");
  client = reverseRefundPoints(client, "CMD-3", 2500, [
    { id: "REF-3", orderId: "CMD-3", amount: 2500, status: "completed" },
  ], "REF-3");
  assert.equal(client.points, -1);
  assert.equal(client.loyaltyTransactions.filter((entry) => entry.type === "refund_reversal").reduce((sum, entry) => sum + Math.abs(entry.points), 0), 2);
});

test("ignores pending and cancelled refunds when calculating reversal", () => {
  const client = awardSalePoints(customer(), "CMD-4", 3000);
  const unchanged = reverseRefundPoints(client, "CMD-4", 3000, [
    { id: "REF-P", orderId: "CMD-4", amount: 3000, status: "pending" },
    { id: "REF-C", orderId: "CMD-4", amount: 3000, status: "cancelled" },
  ], "REF-P");
  assert.equal(unchanged.points, 3);
});

test("reward redemption requires an active reward and sufficient whole-number points", () => {
  assert.equal(canRedeemLoyaltyReward(customer({ points: 99 }), reward), false);
  assert.equal(canRedeemLoyaltyReward(customer({ points: 100 }), reward), true);
  assert.equal(canRedeemLoyaltyReward(customer({ points: 100 }), { ...reward, active: false }), false);
});

test("redeems exactly once per redemption reference and stores a ledger entry", () => {
  const first = redeemLoyaltyReward(customer({ points: 150 }), reward, "RED-2", "2026-11-19T12:00:00.000Z");
  const repeated = redeemLoyaltyReward(first, reward, "RED-2", "2026-11-19T12:01:00.000Z");
  assert.equal(first.points, 50);
  assert.equal(repeated.points, 50);
  assert.equal(repeated.rewardHistory.length, 1);
  assert.equal(repeated.loyaltyTransactions.length, 1);
});
