import type { Customer, LoyaltyReward, Refund } from "./types";

export function normalizeCustomerName(value: string): string;
export function findLoyaltyCustomerForOrder(customers: Customer[], order: { customerId?: string; customerName: string } | undefined): Customer | undefined;
export function awardSalePoints(customer: Customer, saleId: string, saleTotal: number, createdAtISO?: string): Customer;
export function reverseRefundPoints(customer: Customer, saleId: string, saleTotal: number, refunds: Refund[], refundId: string, createdAtISO?: string): Customer;
export function canRedeemLoyaltyReward(customer: Customer | undefined, reward: LoyaltyReward | undefined): boolean;
export function redeemLoyaltyReward(customer: Customer, reward: LoyaltyReward, redemptionId: string, redeemedAtISO?: string): Customer;
