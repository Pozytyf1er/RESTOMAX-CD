import type { InventoryItem, MenuItem, StockMovement, StockMovementType } from "./types";

export function isValidStockQuantity(value: number, allowZero?: boolean): boolean;
export function roundStockQuantity(value: number): number;
export function canRecordStockMovement(item: InventoryItem | undefined, type: StockMovementType, quantity: number, reason: string): boolean;
export function canCreateInventoryItem(input: Omit<InventoryItem, "id" | "recipes">, inventory: InventoryItem[]): boolean;
export function canUpdateStockThreshold(item: InventoryItem | undefined, threshold: number): boolean;
export function canUpdateStockRecipe(item: InventoryItem | undefined, menuItem: MenuItem | undefined, quantity: number): boolean;
export function getStockReversalQuantities(movements: StockMovement[], reference: string): { inventoryItemId: string; quantity: number }[];
