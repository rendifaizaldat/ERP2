export interface InventoryState {
  [sku: string]: {
    stock: number;
    last_updated: string;
  };
}

export interface SalesState {
  total_revenue: number;
  total_transactions: number;
  total_refunds: number;
  last_invoice: string | null;
}

export type ItemStatus = "PENDING" | "COOKING" | "SERVED";

export interface OrderItem {
  id: string;
  productId: string;
  skuSnapshot: string;
  nameSnapshot: string;
  basePriceSnapshot: number;
  qty: number;
  voidedQty: number;
  refundedQty: number;
  status: ItemStatus;
  voidReason?: string | null;
  notes: string | null;
}
