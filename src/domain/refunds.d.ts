import type { PermissionKey, Refund, RestaurantOrder, StaffRole } from "./types";

export function reservedRefundTotal(refunds: Refund[], paymentId: string): number;
export function completedRefundTotal(refunds: Refund[], orderId: string): number;
export function canRecordRefund(order: RestaurantOrder | undefined, refunds: Refund[], paymentId: string, amount: number, reason: string, role: StaffRole, limit: number | undefined, overrides?: Partial<Record<PermissionKey, boolean>>, availableCash?: number): boolean;
export function canCompleteRefund(refund: Refund | undefined): boolean;
export function getOrderPaymentStatus(order: RestaurantOrder, refunds: Refund[]): "unpaid" | "partial" | "paid" | "partially_refunded" | "refunded";
export function canCancelRefund(refund: Refund | undefined): boolean;
