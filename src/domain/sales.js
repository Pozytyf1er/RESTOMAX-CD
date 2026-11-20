export function orderTotal(order) {
  return order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

export function paidTotal(order) {
  return (order.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0);
}

export function isSaleEligibleForRevenue(order) {
  const total = orderTotal(order);
  const paid = paidTotal(order);
  return order.status !== "cancelled"
    && Boolean(order.closedAtISO || order.closedAt)
    && total > 0
    && paid >= total;
}

export function canRecordPayment(order, payment) {
  if (!["ready", "served"].includes(order.status) || order.closedAt || order.closedAtISO) return false;
  if (!payment || !["cash", "mobile_money", "card", "other"].includes(payment.method)) return false;
  if (!Number.isSafeInteger(payment.amount) || payment.amount <= 0) return false;
  if (!payment.id || (order.payments ?? []).some((entry) => entry.id === payment.id)) return false;
  return payment.amount <= orderTotal(order) - paidTotal(order);
}

export function canCloseSale(order) {
  return ["ready", "served"].includes(order.status)
    && !order.closedAt
    && !order.closedAtISO
    && orderTotal(order) > 0
    && paidTotal(order) >= orderTotal(order);
}

export function canCancelOrder(order) {
  return !["served", "cancelled"].includes(order.status)
    && !order.closedAt
    && !order.closedAtISO
    && (order.paymentStatus ?? "unpaid") === "unpaid"
    && paidTotal(order) === 0;
}

export function canOrderAtTableStatus(status) {
  return status === "available" || status === "occupied";
}
