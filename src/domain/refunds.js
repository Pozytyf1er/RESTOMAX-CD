import { canRefund } from "./permissions.js";
import { orderTotal, paidTotal } from "./sales.js";

export function reservedRefundTotal(refunds, paymentId) {
  return refunds.filter((refund) => refund.paymentId === paymentId && refund.status !== "cancelled").reduce((sum, refund) => sum + refund.amount, 0);
}

export function completedRefundTotal(refunds, orderId) {
  return refunds.filter((refund) => refund.orderId === orderId && refund.status === "completed").reduce((sum, refund) => sum + refund.amount, 0);
}

export function canRecordRefund(order, refunds, paymentId, amount, reason, role, limit, overrides = {}, availableCash) {
  if (!order || !(order.closedAtISO || order.closedAt) || order.paymentStatus === "refunded") return false;
  const fullyPaid = paidTotal(order) >= orderTotal(order) && orderTotal(order) > 0;
  if (!fullyPaid || (!["paid", "partially_refunded"].includes(order.paymentStatus ?? "") && order.paymentStatus !== undefined)) return false;
  const payment = (order.payments ?? []).find((entry) => entry.id === paymentId);
  if (!payment || !Number.isSafeInteger(amount) || amount <= 0 || typeof reason !== "string" || reason.trim().length < 8 || reason.trim().length > 200) return false;
  if (amount > payment.amount - reservedRefundTotal(refunds, paymentId)) return false;
  if (!canRefund(role, amount, Number.isSafeInteger(limit) ? limit : 0, overrides)) return false;
  if (payment.method === "cash" && (!Number.isSafeInteger(availableCash) || availableCash < amount)) return false;
  return true;
}

export function canCompleteRefund(refund) {
  return Boolean(refund && refund.status === "pending" && refund.method !== "cash");
}

export function getOrderPaymentStatus(order, refunds) {
  const paid = (order.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0);
  const completed = completedRefundTotal(refunds, order.id);
  if (completed <= 0) return order.paymentStatus ?? (paid >= orderTotal(order) ? "paid" : "unpaid");
  return completed >= paid ? "refunded" : "partially_refunded";
}

export function canCancelRefund(refund) {
  return Boolean(refund && refund.status === "pending");
}
