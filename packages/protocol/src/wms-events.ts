import { z } from "zod";

// --- PAYLOAD SCHEMAS ---
export const GlobalCategoryCreatedPayloadSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const GlobalCategoryUpdatedPayloadSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const GlobalCategoryDeletedPayloadSchema = z.object({
  id: z.string(),
});

export const GlobalProductCreatedPayloadSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseUom: z.string(),
  categoryId: z.string(),
});

export const MasterProductAddedPayloadSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  baseUom: z.string(),
  categoryId: z.string(),
  regionId: z.string(), // SEKARANG WAJIB ADA
  branchId: z.string().optional().nullable(),
  price: z.number().optional(),
  purchasePrice: z.number().optional(),
  margin: z.number().optional(),
  sellingPrice: z.number().optional(),
});

export const GlobalProductUpdatedPayloadSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseUom: z.string(),
  categoryId: z.string(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const RegionalItemSubmittedPayloadSchema = z.object({
  id: z.string(),
  regionId: z.string(),
  branchId: z.string().optional().nullable(),
  localName: z.string(),
  localCategory: z.string().optional().nullable(),
  uom: z.string(),
  purchasePrice: z.number(),
  margin: z.number(),
  sellingPrice: z.number(),
});

export const RegionalItemUpdatedPayloadSchema = z.object({
  id: z.string(),
  localName: z.string(),
  purchasePrice: z.number(),
  margin: z.number(),
  sellingPrice: z.number(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const ItemMergedToGlobalPayloadSchema = z.object({
  regionalItemId: z.string(),
  globalId: z.string(),
});

export const ItemsBatchCentralizedPayloadSchema = z.object({
  globalId: z.string().optional(),
  globalName: z.string(),
  baseUom: z.string(),
  categoryId: z.string(),
  regionalItemIds: z.array(z.string()),
});

export const ItemUnmergedPayloadSchema = z.object({
  regionalItemId: z.string(),
});

// --- RECEIVING, MUTASI & VENDOR ---
export const ReceivingOutletSubmittedPayloadSchema = z.object({
  id: z.string(),
  regionId: z.string(),
  branchId: z.string(),
  transactionType: z.string(),
  sourceEntity: z.string(),
  invoiceNumber: z.string().optional().nullable(),
  totalAmount: z.number(),
  paymentStatus: z.string(),
  totalPayment: z.number(),
  dueDate: z.string().optional().nullable(),
  proofOfTransaction: z.string().optional().nullable(),
  receivedAt: z.string(),
  paymentMethod: z.string().optional().nullable(),
  fundingSource: z.string().optional().nullable(),
  mutationType: z.string().optional().nullable(),
  targetRegionId: z.string().optional().nullable(),
  loanStatus: z.string().optional().nullable(),
  returnMethod: z.string().optional().nullable(),
  items: z.array(
    z.object({
      regionalItemId: z.string(),
      itemName: z.string(),
      uom: z.string(),
      qty: z.number(),
      price: z.number(),
      subtotal: z.number(),
    }),
  ),
});

export const ReceivingPusatSubmittedPayloadSchema = z.object({
  id: z.string(),
  regionId: z.string(),
  transactionType: z.string(),
  sourceEntity: z.string(),
  invoiceNumber: z.string().optional().nullable(),
  totalAmount: z.number(),
  paymentStatus: z.string(),
  totalPayment: z.number(),
  dueDate: z.string().optional().nullable(),
  proofOfTransaction: z.string().optional().nullable(),
  receivedAt: z.string(),
  items: z.array(
    z.object({
      regionalItemId: z.string(),
      itemName: z.string(),
      uom: z.string(),
      qty: z.number(),
      price: z.number(),
      subtotal: z.number(),
    }),
  ),
});

export const VendorCreatedPayloadSchema = z.object({
  id: z.string(),
  regionId: z.string(),
  name: z.string(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  certifications: z.array(z.string()).optional(),
  contractFileUrl: z.string().optional().nullable(),
});

export const VendorUpdatedPayloadSchema = VendorCreatedPayloadSchema.extend({
  isActive: z.boolean(),
});

export const VendorDeletedPayloadSchema = z.object({
  id: z.string(),
});

// --- PIUTANG / HUTANG & PAYMENT ---
export const PaymentCreatedPayloadSchema = z.object({
  id: z.string(),
  receivingId: z.string(),
  amount: z.number(),
  depositAmount: z.number().optional().default(0),
  externalAmount: z.number().optional().default(0),
  paymentDate: z.string(),
  proofOfTransfer: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
  newPaymentStatus: z.string(),
  newTotalPayment: z.number(),
});

export const ApOutletPaymentSubmittedPayloadSchema = z.object({
  id: z.string(),
  receivingId: z.string(),
  amount: z.number(),
  paymentMethod: z.string(),
  fundingSource: z.string().optional().nullable(),
  paymentDate: z.string(),
  proofOfTransfer: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
  newPaymentStatus: z.string(),
  newTotalPayment: z.number(),
  newLoanStatus: z.string().optional().nullable(),
});

export const ReceivingStatusUpdatedPayloadSchema = z.object({
  id: z.string(),
  docStatus: z.string(),
});

export const PaymentVoidedPayloadSchema = z.object({
  paymentId: z.string(),
});

export const ReceivingUpdatedPayloadSchema = z.any();

export const OutletBalanceMutatedPayloadSchema = z.object({
  id: z.string(),
  outletId: z.string(),
  mutationType: z.enum([
    "IN_OVERPAYMENT",
    "IN_LOAN",
    "IN_REFUND_VOID",
    "OUT_PAYMENT",
    "OUT_REFUND",
  ]),
  amount: z.number(),
  balanceAfter: z.number(),
  referenceId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  proofOfTransfer: z.string().optional().nullable(),
  createdBy: z.string(),
});

export const BulkPiutangPaymentProcessedPayloadSchema = z.object({
  bulkId: z.string(),
  outletId: z.string(),
  totalAmountPaid: z.number(),
  useDeposit: z.boolean().optional(),
  depositUsed: z.number().optional(),
  overpayment: z.number().optional(),
  paymentDate: z.string(),
  notes: z.string().optional().nullable(),
  proofOfTransfer: z.string().optional().nullable(),
  allocations: z.array(
    z.object({
      receivingId: z.string(),
      amountAllocated: z.number(),
      depositAmount: z.number().optional().default(0),
      externalAmount: z.number().optional().default(0),
      newPaymentStatus: z.string(),
      newTotalPayment: z.number(),
    }),
  ),
  createdBy: z.string().optional().nullable(),
});

export const ItemsLinkedToMasterPayloadSchema = z.object({
  globalId: z.string(),
  regionalItemIds: z.array(z.string()),
});

export const ItemsBulkVerifiedPayloadSchema = z.object({
  verifications: z.array(
    z.object({
      regionalItemId: z.string(),
      globalId: z.string(),
    }),
  ),
  categoryId: z.string(),
});

// --- WALLET ACCOUNT / E-WALLET SCHEMAS ---
export const WmsWalletAccountCreatedPayloadSchema = z.object({
  id: z.string(),
  regionId: z.string(),
  branchId: z.string(),
  managedBy: z.string(),
  type: z.string(),
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  accountHolder: z.string().optional().nullable(),
  accountName: z.string(),
  binding: z.array(z.string()).optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional().nullable(),
  _deleted: z.boolean().optional(),
  _operatorId: z.string().optional(),
});

export const WmsWalletAccountDeletedPayloadSchema = z.object({
  id: z.string(),
  _operatorId: z.string().optional(),
});

export const FinancialConfigUpdatedPayloadSchema = z.object({
  branchId: z.string(),
  taxRate: z.number(),
  serviceRate: z.number(),
  apLimitRate: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _deleted: z.boolean().optional(),
  _operatorId: z.string().optional(),
});

// --- DISCRIMINATED UNION EVENTS ---
export const WmsEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("CATEGORY_CREATED"),
    payload: GlobalCategoryCreatedPayloadSchema,
  }),
  z.object({
    type: z.literal("CATEGORY_UPDATED"),
    payload: GlobalCategoryUpdatedPayloadSchema,
  }),
  z.object({
    type: z.literal("CATEGORY_DELETED"),
    payload: GlobalCategoryDeletedPayloadSchema,
  }),
  z.object({
    type: z.literal("MASTER_PRODUCT_ADDED"),
    payload: MasterProductAddedPayloadSchema,
  }),
  z.object({
    type: z.literal("ITEMS_LINKED_TO_MASTER"),
    payload: ItemsLinkedToMasterPayloadSchema,
  }),
  z.object({
    type: z.literal("ITEMS_BULK_VERIFIED"),
    payload: ItemsBulkVerifiedPayloadSchema,
  }),
  z.object({
    type: z.literal("GLOBAL_CATEGORY_CREATED"),
    payload: GlobalCategoryCreatedPayloadSchema,
  }),
  z.object({
    type: z.literal("GLOBAL_CATEGORY_UPDATED"),
    payload: GlobalCategoryUpdatedPayloadSchema,
  }),
  z.object({
    type: z.literal("GLOBAL_CATEGORY_DELETED"),
    payload: GlobalCategoryDeletedPayloadSchema,
  }),
  z.object({
    type: z.literal("GLOBAL_PRODUCT_CREATED"),
    payload: GlobalProductCreatedPayloadSchema,
  }),
  z.object({
    type: z.literal("GLOBAL_PRODUCT_UPDATED"),
    payload: GlobalProductUpdatedPayloadSchema,
  }),
  z.object({
    type: z.literal("OUTLET_PRODUCT_UPDATED"),
    payload: RegionalItemUpdatedPayloadSchema,
  }),
  z.object({
    type: z.literal("REGIONAL_ITEM_SUBMITTED"),
    payload: RegionalItemSubmittedPayloadSchema,
  }),
  z.object({
    type: z.literal("REGIONAL_ITEM_UPDATED"),
    payload: RegionalItemUpdatedPayloadSchema,
  }),
  z.object({
    type: z.literal("ITEM_MERGED_TO_GLOBAL"),
    payload: ItemMergedToGlobalPayloadSchema,
  }),
  z.object({
    type: z.literal("ITEM_LINKED_TO_MASTER"),
    payload: ItemMergedToGlobalPayloadSchema,
  }),
  z.object({
    type: z.literal("ITEMS_BATCH_CENTRALIZED"),
    payload: ItemsBatchCentralizedPayloadSchema,
  }),
  z.object({
    type: z.literal("ITEM_UNMERGED"),
    payload: ItemUnmergedPayloadSchema,
  }),
  z.object({
    type: z.literal("RECEIVING_OUTLET_SUBMITTED"),
    payload: ReceivingOutletSubmittedPayloadSchema,
  }),
  z.object({
    type: z.literal("RECEIVING_PUSAT_SUBMITTED"),
    payload: ReceivingPusatSubmittedPayloadSchema,
  }),
  z.object({
    type: z.literal("VENDOR_CREATED"),
    payload: VendorCreatedPayloadSchema,
  }),
  z.object({
    type: z.literal("VENDOR_UPDATED"),
    payload: VendorUpdatedPayloadSchema,
  }),
  z.object({
    type: z.literal("VENDOR_DELETED"),
    payload: VendorDeletedPayloadSchema,
  }),
  z.object({
    type: z.literal("PAYMENT_CREATED"),
    payload: PaymentCreatedPayloadSchema,
  }),
  z.object({
    type: z.literal("AP_OUTLET_PAYMENT_SUBMITTED"),
    payload: ApOutletPaymentSubmittedPayloadSchema,
  }),
  z.object({
    type: z.literal("RECEIVING_STATUS_UPDATED"),
    payload: ReceivingStatusUpdatedPayloadSchema,
  }),
  z.object({
    type: z.literal("PAYMENT_VOIDED"),
    payload: PaymentVoidedPayloadSchema,
  }),
  z.object({
    type: z.literal("RECEIVING_UPDATED"),
    payload: ReceivingUpdatedPayloadSchema,
  }),
  z.object({
    type: z.literal("OUTLET_BALANCE_MUTATED"),
    payload: OutletBalanceMutatedPayloadSchema,
  }),
  z.object({
    type: z.literal("BULK_PIUTANG_PAYMENT_PROCESSED"),
    payload: BulkPiutangPaymentProcessedPayloadSchema,
  }),

  // WMS WALLET EVENTS
  z.object({
    type: z.literal("WMS_WALLET_ACCOUNT_CREATED"),
    payload: WmsWalletAccountCreatedPayloadSchema,
  }),
  z.object({
    type: z.literal("WMS_WALLET_ACCOUNT_DELETED"),
    payload: WmsWalletAccountDeletedPayloadSchema,
  }),
  z.object({
    type: z.literal("WMS_FINANCIAL_CONFIG_UPDATED"),
    payload: FinancialConfigUpdatedPayloadSchema,
  }),
]);

export const WmsEventEnvelopeSchema = z.object({
  eventId: z.string(),
  aggregateId: z.string(),
  timestamp: z.string(),
  event: WmsEventSchema,
});

export type WmsEventType = z.infer<typeof WmsEventSchema>["type"];
export type WmsEvent = z.infer<typeof WmsEventSchema>;
export type WmsEventEnvelope = z.infer<typeof WmsEventEnvelopeSchema>;
