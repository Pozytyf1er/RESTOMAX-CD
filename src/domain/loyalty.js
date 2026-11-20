export function normalizeCustomerName(value) {
  return typeof value === "string"
    ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("fr").replace(/\s+/g, " ")
    : "";
}

export function findLoyaltyCustomerForOrder(customers, order) {
  if (!Array.isArray(customers) || !order) return undefined;
  if (order.customerId) return customers.find((customer) => customer.id === order.customerId);
  const normalizedName = normalizeCustomerName(order.customerName);
  if (!normalizedName) return undefined;
  const matches = customers.filter((customer) => normalizeCustomerName(customer.name) === normalizedName);
  return matches.length === 1 ? matches[0] : undefined;
}

function appendTransaction(customer, transaction) {
  const ledger = customer.loyaltyTransactions ?? [];
  if (ledger.some((entry) => entry.id === transaction.id)) return customer;
  return {
    ...customer,
    points: customer.points + transaction.points,
    loyaltyTransactions: [transaction, ...ledger],
  };
}

export function awardSalePoints(customer, saleId, saleTotal, createdAtISO = new Date().toISOString()) {
  if (!customer || typeof saleId !== "string" || !saleId || !Number.isSafeInteger(saleTotal) || saleTotal <= 0) return customer;
  const ledger = customer.loyaltyTransactions ?? [];
  if (ledger.some((entry) => entry.type === "earned" && entry.saleId === saleId)) return customer;
  const points = Math.floor(saleTotal / 1000);
  return appendTransaction(customer, {
    id: `LOY-EARN-${saleId}`, type: "earned", points, saleId, amountXOF: saleTotal, createdAtISO,
  });
}

export function reverseRefundPoints(customer, saleId, saleTotal, refunds, refundId, createdAtISO = new Date().toISOString()) {
  if (!customer || !saleId || !refundId || !Number.isSafeInteger(saleTotal) || saleTotal <= 0 || !Array.isArray(refunds)) return customer;
  const ledger = customer.loyaltyTransactions ?? [];
  if (ledger.some((entry) => entry.id === `LOY-REFUND-${refundId}`)) return customer;
  const earned = ledger.find((entry) => entry.type === "earned" && entry.saleId === saleId);
  if (!earned || earned.points <= 0) return customer;
  const refundedAmount = refunds
    .filter((refund) => refund.orderId === saleId && refund.status === "completed")
    .reduce((sum, refund) => sum + refund.amount, 0);
  const targetReversal = Math.min(earned.points, Math.floor(Math.min(refundedAmount, saleTotal) / 1000));
  const alreadyReversed = ledger
    .filter((entry) => entry.type === "refund_reversal" && entry.saleId === saleId)
    .reduce((sum, entry) => sum + Math.abs(entry.points), 0);
  const pointsToReverse = Math.max(0, targetReversal - alreadyReversed);
  if (pointsToReverse === 0) return customer;
  return appendTransaction(customer, {
    id: `LOY-REFUND-${refundId}`, type: "refund_reversal", points: -pointsToReverse,
    saleId, refundId, amountXOF: refundedAmount, createdAtISO,
  });
}

export function canRedeemLoyaltyReward(customer, reward) {
  return Boolean(customer && reward && reward.active === true
    && Number.isSafeInteger(reward.pointsCost) && reward.pointsCost > 0
    && Number.isSafeInteger(customer.points) && customer.points >= reward.pointsCost);
}

export function redeemLoyaltyReward(customer, reward, redemptionId, redeemedAtISO = new Date().toISOString()) {
  if (!canRedeemLoyaltyReward(customer, reward) || typeof redemptionId !== "string" || !redemptionId) return customer;
  const transactionId = `LOY-REDEEM-${redemptionId}`;
  if ((customer.loyaltyTransactions ?? []).some((entry) => entry.id === transactionId)) return customer;
  const redeemedAt = redeemedAtISO.slice(0, 10);
  const next = appendTransaction(customer, {
    id: transactionId, type: "redeemed", points: -reward.pointsCost,
    rewardId: reward.id, createdAtISO: redeemedAtISO,
  });
  return {
    ...next,
    rewardHistory: [{ rewardName: reward.name, rewardId: reward.id, redemptionId, redeemedAt }, ...customer.rewardHistory],
  };
}
