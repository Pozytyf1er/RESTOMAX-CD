import type { GoodsReceiptLine, InventoryItem, PurchaseOrder, PurchaseOrderLine, Supplier } from "./types";

export function canCreatePurchaseOrder(supplier: Supplier | undefined, inventory: InventoryItem[], lines: Pick<PurchaseOrderLine, "inventoryItemId" | "quantity" | "unitCost">[]): boolean;
export function purchaseOrderTotal(lines: Pick<PurchaseOrderLine, "quantity" | "unitCost">[]): number;
export function canReceivePurchaseOrder(order: PurchaseOrder | undefined, receiptLines: Pick<GoodsReceiptLine, "purchaseOrderLineId" | "quantity">[], inventory?: InventoryItem[]): boolean;
export function applyPurchaseReceipt(order: PurchaseOrder, receiptLines: Pick<GoodsReceiptLine, "purchaseOrderLineId" | "quantity">[]): PurchaseOrder;
