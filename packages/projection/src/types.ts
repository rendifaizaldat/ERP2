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

export interface SettingsState {
  [key: string]: any;
}

export interface ReconProjection {
  systemCash: number;
  activeTables: number;
  voidRefundCount: number;
}

export interface ReportProjection {
  totalTrx: number;
  initialCash: number;
  cashSales: number;
  systemCash: number;
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalService: number;
  catSales: Record<string, { qty: number; total: number }>;
  paymentSales: Record<string, number>;
  pettyCashOut: number;
  totalVoid: number;
  totalRefund: number;
  staffList: string[];
  pluData: Array<[string, { qty: number; total: number }]>;
}

export interface CashProjection {
  currentCash: number;
  openingCash: number;
  pettyCash: number;
  cashIn: number;
  cashOut: number;
  closingCash: number;
  pettyCashTransactions: any[];
}
