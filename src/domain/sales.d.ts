import type { OrderPayment, RestaurantOrder } from "./types";

export function orderTotal(order: RestaurantOrder): number;
export function paidTotal(order: RestaurantOrder): number;
export function isSaleEligibleForRevenue(order: RestaurantOrder): boolean;
export function canRecordPayment(order: RestaurantOrder, payment: OrderPayment): boolean;
export function canCloseSale(order: RestaurantOrder): boolean;

export function canCancelOrder(order: RestaurantOrder): boolean;

export function canOrderAtTableStatus(status: string): boolean;
