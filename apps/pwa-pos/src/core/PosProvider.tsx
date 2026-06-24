import React, { createContext, useContext } from "react";
import {
  usePosSync,
  ExtendedProjectorState,
  ViewStateContract,
} from "./hooks/usePosSync";
import { usePosActions } from "./hooks/usePosActions";

interface PosContextType {
  state: ExtendedProjectorState;
  isReady: boolean;
  isInitialized: boolean;
  currentOperator: any | null;
  isScreenLocked: boolean;
  viewState: ViewStateContract;
  setViewStateDirect: (view: Partial<ViewStateContract>) => void;
  // Actions
  initializeSystem: (data: any) => Promise<void>;
  registerStaff: (data: any) => Promise<void>;
  editStaff: (id: string, data: any) => Promise<void>;
  toggleStaffStatus: (id: string, isActive: boolean) => Promise<void>;
  addMasterTable: (data: any) => Promise<void>;
  deleteMasterTable: (id: string, label: string) => Promise<void>;
  toggleMasterTableStatus: (
    tableId: string,
    isActive: boolean,
  ) => Promise<void>;
  addMasterCategory: (name: string) => Promise<string | undefined>;
  deleteMasterCategory: (id: string) => Promise<void>;
  addMasterProduct: (data: any) => Promise<void>;
  editMasterProduct: (data: any) => Promise<void>;
  deleteMasterProduct: (sku: string) => Promise<void>;
  toggleProductStatus: (sku: string, isActive: boolean) => Promise<void>;
  validatePinOnly: (
    pin: string,
  ) => Promise<{ valid: boolean; staff?: any; message?: string }>;
  openShiftWithModal: (pin: string, initialCash: number) => Promise<void>;
  logoutWithReconciliation: (
    actualCash: number,
    systemCash: number,
    difference: number,
    differenceReason: string,
  ) => Promise<void>;
  executeEndOfDay: (
    actualCash: number,
    expectedCash: number,
    cashDiff: number,
    actualNonCash: number,
    expectedNonCash: number,
    nonCashDiff: number,
    differenceReason: string,
  ) => Promise<void>;
  executeSale: (enterprisePayload: any) => Promise<void>;
  placeTableOrder: (
    tableLabel: string,
    grandTotal: number,
    items: any[],
    isVirtual?: boolean,
    parentTableId?: string,
    customerName?: string | null,
  ) => Promise<void>;
  processTablePayment: (tableLabel: string) => Promise<void>;
  clearTableStatus: (tableLabel: string) => Promise<void>;
  voidTableOrder: (
    tableLabel: string,
    sku: string, // Ini sekarang menerima targetItemId dari PWA (biarkan penamaan parameter legacy)
    qtyToVoid: number,
    voidType: any,
    managerPin?: string,
    voidNote?: string,
  ) => Promise<void>;
  refundTransaction: (
    invoice_id: string,
    items: any[],
    refundType: any,
    managerPin: string,
    refundNote: string,
  ) => Promise<void>;
  issuePettyCash: (data: any) => Promise<void>;
  resolvePettyCash: (
    id: string,
    amountReturned: number,
    hasReceipt: boolean,
  ) => Promise<void>;

  // =========================================================
  // [+] TAMBAHAN INTERFACE UNTUK FUNGSI ARSITEKTUR 3-LAPIS
  // =========================================================
  updateOrderItems: (
    orderId: string,
    tableLabel: string,
    items: any[],
    customerName?: string | null,
  ) => Promise<void>;

  executePaymentRefund: (
    invoiceId: string,
    items: Array<{
      productId: string;
      sku: string;
      qtyRefunded: number;
      amountRefunded: number;
    }>,
    refundMethod: "CASH" | "CARD" | "QRIS" | "EWALLET" | "BANK_TRANSFER",
    totalRefundAmount: number,
    reason: string,
    managerPin: string,
    refundType?: "CANCEL" | "SOLD_OUT",
  ) => Promise<void>;

  moveTableOrderV2: (
    sourceTableLabel: string,
    targetTableLabel: string,
    orderId: string,
    items: any[],
    customerName?: string | null,
  ) => Promise<void>;

  executeTransferToExistingTable: (
    sourceOrderId: string,
    sourceTableLabel: string,
    remainingSourceItems: any[],
    targetOrderId: string | null,
    targetTableLabel: string,
    targetCustomerName: string | null,
    finalTargetItems: any[],
  ) => Promise<void>;

  executeSplitOrderV2: (
    sourceOrderId: string,
    sourceTableLabel: string,
    remainingItems: any[],
    splitTables: Array<{
      label: string;
      items: any[];
      customerName?: string;
    }>,
  ) => Promise<void>;

  updateKdsItemStatus: (
    tableLabel: string,
    orderId: string,
    sku: string,
    newStatus: "PENDING" | "COOKING" | "SERVED",
  ) => Promise<void>;
}

const PosContext = createContext<PosContextType | null>(null);

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const syncData = usePosSync();
  const actions = usePosActions(syncData);

  return (
    <PosContext.Provider value={{ ...syncData, ...actions }}>
      {children}
    </PosContext.Provider>
  );
};

export const usePos = () => {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePos must be used within PosProvider");
  return ctx;
};
