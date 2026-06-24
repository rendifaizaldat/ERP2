import { z } from "zod";

export const EventMetadataSchema = z.object({
  seq: z.number().int().positive(),
  prev_hash: z.string(),
  hash: z.string(),
  hlc: z.string(),
  origin_device_id: z.string(),
  operator_id: z.string(),
  branch_id: z.string(),
  signature: z.string(),
});

export const MemberSchema = z.object({
  member_id: z.string(),
  name: z.string(),
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "LEGENDARY"]),
  phone: z.string(),
});

const SystemInitializedPayload = z.object({
  company_name: z.string(),
  branch_id: z.string(),
  region_name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  admin_name: z.string(),
  admin_pin: z.string(),
});

// ============================================================================
// [LEGACY] SKEMA TRANSAKSI (Dipertahankan untuk kompatibilitas data lama)
// ============================================================================
const EnterpriseSaleItemSchema = z.object({
  product_id: z.string(),
  sku: z.string(),
  product_name: z.string(),
  category_id: z.string(),
  category_name: z.string(),
  qty: z.number(),
  selling_price: z.number(),
  discount_amount: z.number().default(0),
  tax_amount: z.number(),
  service_amount: z.number(),
  line_total: z.number(),
});

const EnterpriseSaleCreatedPayload = z.object({
  identity: z.object({
    transaction_id: z.string(),
    invoice_number: z.string(),
    order_number: z.string(),
    transaction_type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]),
    transaction_status: z.enum(["OPEN", "PAID", "CANCELLED", "REFUNDED"]),
    business_date: z.string(),
    created_at: z.number(),
    paid_at: z.number(),
    closed_at: z.number(),
  }),
  organization: z.object({
    company_id: z.string(),
    company_name: z.string(),
    branch_id: z.string(),
    branch_name: z.string(),
    outlet_type: z.string(),
    region: z.string(),
  }),
  table_info: z.object({
    table_id: z.string(),
    table_name: z.string(),
  }),
  customer: z.object({
    customer_name: z.string(),
  }),
  items: z.array(EnterpriseSaleItemSchema),
  payment: z.object({
    payment_id: z.string(),
    payment_method: z.string(),
    payment_provider: z.string(),
    payment_reference: z.string(),
    amount_paid: z.number(),
    change_amount: z.number(),
    payment_time: z.number(),
  }),
  staff: z.object({
    waiter_id: z.string(),
    waiter_name: z.string(),
    cashier_id: z.string(),
    cashier_name: z.string(),
    supervisor_id: z.string().optional(),
    shift_id: z.string(),
  }),
  device: z.object({
    device_id: z.string(),
    device_name: z.string(),
    app_version: z.string(),
    sync_version: z.string(),
    local_event_id: z.string(),
  }),
  summary: z.object({
    subtotal: z.number(),
    total_discount: z.number(),
    total_tax: z.number(),
    total_service: z.number(),
    grand_total: z.number(),
  }),
});

const TableOrderItemSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  price: z.number(),
  qty: z.number(),
  note: z.string().default(""),
  tableLabel: z.string(),
  status: z.enum(["CRUD", "READ_ONLY"]),
  variant_id: z.string().optional(),
  modifiers: z
    .array(
      z.object({
        modifier_sku: z.string(),
        name: z.string(),
        price: z.number(),
      }),
    )
    .optional(),
});

const TableOrderPlacedPayload = z.object({
  id: z.string(),
  tableLabel: z.string(),
  grandTotal: z.number(),
  isVirtual: z.boolean().default(false),
  parentTableId: z.string().optional(),
  items: z.array(TableOrderItemSchema),
});

const OrderVoidedPayload = z.object({
  tableLabel: z.string(),
  sku: z.string(),
  qtyToVoid: z.number(),
  voidType: z.enum(["SALAH_INPUT", "BARANG_KOSONG", "CANCEL"]),
  operator_id: z.string(),
  manager_id: z.string().optional(),
  voidNote: z.string().optional(),
  timestamp: z.number().optional(),
});

const OrderRefundedPayload = z.object({
  invoice_id: z.string(),
  items: z.array(z.object({ sku: z.string(), qty: z.number() })),
  refundType: z.enum(["CANCEL", "SOLD_OUT"]),
  operator_id: z.string(),
  manager_id: z.string(),
  refundNote: z.string(),
  timestamp: z.number().optional(),
});

// ============================================================================
// [NEW] SKEMA ARSITEKTUR 3 LAPIS (ORDER -> INVOICE -> PAYMENT)
// ============================================================================

// Layer 1: Order (Pesanan / Dapur)
const LayerOrderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  skuSnapshot: z.string(),
  nameSnapshot: z.string(),
  basePriceSnapshot: z.number(),
  qty: z.number(),
  voidedQty: z.number().default(0),
  refundedQty: z.number().default(0),
  status: z.enum(["PENDING", "COOKING", "SERVED"]).default("PENDING"),
  voidReason: z
    .enum(["SALAH_INPUT", "BARANG_KOSONG", "CANCEL"])
    .optional()
    .nullable(),
  notes: z.string().nullable(),
});

const LayerOrderEventSchema = z.object({
  orderId: z.string(),
  tableLabel: z.string(),
  customerName: z.string().nullable(),
  guestCount: z.number(),
  operatorId: z.string(),
  items: z.array(LayerOrderItemSchema),
  businessDate: z.string().default("1970-01-01"),
});

// Layer 2: Invoice (Tagihan / Keuangan)
const LayerInvoiceEventSchema = z.object({
  invoiceId: z.string(),
  orderId: z.string().nullable(),
  invoiceNumber: z.string(),
  operatorId: z.string(),
  subtotal: z.number(),
  taxRate: z.number(),
  taxAmount: z.number(),
  serviceRate: z.number(),
  serviceAmount: z.number(),
  discountAmount: z.number(),
  grandTotal: z.number(),
  status: z.enum([
    "unpaid",
    "partial",
    "paid",
    "void",
    "refunded",
    "complimentary",
  ]),
  businessDate: z.string().default("1970-01-01"),
});

const LayerInvoiceStatusUpdateSchema = z.object({
  invoiceId: z.string(),
  newStatus: z.enum([
    "unpaid",
    "partial",
    "paid",
    "void",
    "refunded",
    "complimentary",
  ]),
  operatorId: z.string(),
  notes: z.string().nullable(),
});

// Layer 3: Payment (Pembayaran / Kas)
const LayerPaymentEventSchema = z.object({
  paymentId: z.string(),
  invoiceId: z.string(),
  operatorId: z.string(),

  method: z.enum(["CASH", "CARD", "QRIS", "EWALLET", "BANK_TRANSFER"]),
  captureMode: z.enum(["MANUAL", "INTEGRATED"]).default("MANUAL"),
  provider: z
    .enum([
      "BCA_EDC",
      "MANDIRI_EDC",
      "MIDTRANS",
      "XENDIT",
      "STRIPE",
      "ADYEN",
      "VERIFONE",
      "INGENICO",
    ])
    .optional()
    .nullable(),

  amountPaid: z.number(),
  changeAmount: z.number(),

  referenceNumber: z.string().optional().nullable(),
  approvalCode: z.string().optional().nullable(),
  rrn: z.string().optional().nullable(),
  traceNumber: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),

  settlementMetadata: z.record(z.string(), z.any()).optional().nullable(),
});

// Pengeluaran Kas untuk Refund
const LayerPaymentRefundedEventSchema = z.object({
  refundId: z.string(),
  invoiceId: z.string(),
  operatorId: z.string(),

  items: z.array(
    z.object({
      productId: z.string(),
      sku: z.string(),
      qtyRefunded: z.number(),
      amountRefunded: z.number(),
    }),
  ),

  refundMethod: z.enum(["CASH", "CARD", "QRIS", "EWALLET", "BANK_TRANSFER"]),
  totalRefundAmount: z.number(),
  reason: z.string(),
});

// ============================================================================
// SKEMA LAINNYA (Master, Kasbon, Meja)
// ============================================================================

const TableAddedPayload = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["MEJA", "LESEHAN"]).default("MEJA"),
  capacity: z.number(),
  created_by: z.enum(["USER", "BOT"]).default("USER"),
});

const MemberPointEarnedPayload = z.object({
  member_id: z.string(),
  invoice_id: z.string(),
  points_added: z.number(),
  current_total_points: z.number(),
});

const MemberTierUpgradedPayload = z.object({
  member_id: z.string(),
  old_tier: z.string(),
  new_tier: z.string(),
  reason: z.string(),
});

const PriceChangedPayload = z.object({
  sku: z.string(),
  new_price: z.number(),
  effective_at: z.string(),
});

const StockAdjustedPayload = z.object({
  sku: z.string(),
  delta: z.number(),
  reason: z.enum(["SALE", "REFUND", "WASTE", "ADJUSTMENT", "RECEIVED"]),
});

const CategoryAddedPayload = z.object({ id: z.string(), name: z.string() });
const CategoryDeletedPayload = z.object({ id: z.string() });
const ProductPayload = z.object({
  sku: z.string(),
  name: z.string(),
  price: z.number(),
  categoryId: z.string(),
});
const ProductToggledPayload = z.object({
  sku: z.string(),
  isActive: z.boolean(),
});
const ProductSkuOnlyPayload = z.object({ sku: z.string() });

const StaffUpdatedPayload = z.object({
  id: z.string(),
  pin: z.string(),
  name: z.string(),
  role: z.enum(["ADMIN", "CASHIER", "WAITER"]),
  isActive: z.boolean(),
});
const StaffToggledPayload = z.object({ id: z.string(), isActive: z.boolean() });

const PettyCashIssuedPayload = z.object({
  petty_cash_id: z.string(),
  requester_name: z.string(),
  requester_division: z.string(),
  notes: z.string(),
  amount_requested: z.number(),
  cashier_id: z.string(),
  cashier_name: z.string(),
  timestamp: z.number(),
});

const PettyCashResolvedPayload = z.object({
  petty_cash_id: z.string(),
  amount_returned: z.number(),
  has_receipt: z.boolean(),
  cashier_id: z.string(),
  cashier_name: z.string(),
  timestamp: z.number(),
});

// ============================================================================
// APP EVENT SCHEMA (Master Union)
// ============================================================================
export const AppEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SYSTEM_INITIALIZED"),
    payload: SystemInitializedPayload,
  }),

  // --- [LEGACY] EVENT TRANSAKSI ---
  z.object({
    type: z.literal("SALE_CREATED"),
    payload: EnterpriseSaleCreatedPayload,
  }),
  z.object({
    type: z.literal("SALE_VOIDED"),
    payload: z.object({ invoice_id: z.string(), reason: z.string() }),
  }),
  z.object({ type: z.literal("ORDER_VOIDED"), payload: OrderVoidedPayload }),
  z.object({
    type: z.literal("ORDER_REFUNDED"),
    payload: OrderRefundedPayload,
  }),
  z.object({
    type: z.literal("TABLE_ORDER_PLACED"),
    payload: TableOrderPlacedPayload,
  }),
  z.object({
    type: z.literal("TABLE_PAYMENT_PROCESSED"),
    payload: z.object({ id: z.string(), tableLabel: z.string() }),
  }),

  // --- [NEW] EVENT TRANSAKSI 3 LAPIS ---
  z.object({
    type: z.literal("ORDER_CREATED"),
    payload: LayerOrderEventSchema,
  }),
  z.object({
    type: z.literal("ORDER_UPDATED"),
    payload: LayerOrderEventSchema,
  }),
  z.object({
    type: z.literal("INVOICE_CREATED"),
    payload: LayerInvoiceEventSchema,
  }),
  z.object({
    type: z.literal("INVOICE_STATUS_UPDATED"),
    payload: LayerInvoiceStatusUpdateSchema,
  }),
  z.object({
    type: z.literal("PAYMENT_RECEIVED"),
    payload: LayerPaymentEventSchema,
  }),
  z.object({
    type: z.literal("PAYMENT_REFUNDED"),
    payload: LayerPaymentRefundedEventSchema,
  }),

  // --- KASBON ---
  z.object({
    type: z.literal("PETTY_CASH_ISSUED"),
    payload: PettyCashIssuedPayload,
  }),
  z.object({
    type: z.literal("PETTY_CASH_RESOLVED"),
    payload: PettyCashResolvedPayload,
  }),

  // --- MEJA / TABLE ---
  z.object({ type: z.literal("TABLE_ADDED"), payload: TableAddedPayload }),
  z.object({
    type: z.literal("TABLE_DELETED"),
    payload: z.object({ id: z.string(), label: z.string() }),
  }),
  z.object({
    type: z.literal("TABLE_TOGGLED"),
    payload: z.object({ id: z.string(), isActive: z.boolean() }),
  }),
  z.object({
    type: z.literal("TABLE_CLEARED"),
    payload: z.object({ id: z.string(), tableLabel: z.string() }),
  }),

  // --- MASTER PRODUK ---
  z.object({
    type: z.literal("CATEGORY_ADDED"),
    payload: CategoryAddedPayload,
  }),
  z.object({
    type: z.literal("CATEGORY_DELETED"),
    payload: CategoryDeletedPayload,
  }),
  z.object({ type: z.literal("PRODUCT_ADDED"), payload: ProductPayload }),
  z.object({ type: z.literal("PRODUCT_EDITED"), payload: ProductPayload }),
  z.object({
    type: z.literal("PRODUCT_TOGGLED"),
    payload: ProductToggledPayload,
  }),
  z.object({
    type: z.literal("PRODUCT_ARCHIVED"),
    payload: ProductSkuOnlyPayload,
  }),
  z.object({
    type: z.literal("PRODUCT_DELETED"),
    payload: ProductSkuOnlyPayload,
  }),

  // --- MASTER STAFF ---
  z.object({ type: z.literal("STAFF_UPDATED"), payload: StaffUpdatedPayload }),
  z.object({ type: z.literal("STAFF_TOGGLED"), payload: StaffToggledPayload }),

  // --- MEMBERSHIP ---
  z.object({ type: z.literal("MEMBER_REGISTERED"), payload: MemberSchema }),
  z.object({
    type: z.literal("MEMBER_POINT_EARNED"),
    payload: MemberPointEarnedPayload,
  }),
  z.object({
    type: z.literal("MEMBER_TIER_UPGRADED"),
    payload: MemberTierUpgradedPayload,
  }),

  // --- INVENTORY / HARGA ---
  z.object({
    type: z.literal("STOCK_ADJUSTED"),
    payload: StockAdjustedPayload,
  }),
  z.object({ type: z.literal("PRICE_CHANGED"), payload: PriceChangedPayload }),

  // --- SHIFT ---
  z.object({
    type: z.literal("SHIFT_OPENED"),
    payload: z.object({
      shiftId: z.string(),
      branchId: z.string(),
      deviceId: z.string(),
      cashierId: z.string(),
      openedAt: z.string(),
      startingCash: z.number(),
      businessDate: z.string(),
    }),
  }),
  z.object({
    type: z.literal("SHIFT_CLOSED"),
    payload: z.object({
      shiftId: z.string(),
      closedAt: z.string(),
      expectedEndingCash: z.number(),
      actualEndingCash: z.number(),
      difference: z.number(),
      expectedNonCash: z.number(),
      actualNonCash: z.number(),
      nonCashDifference: z.number(),
      differenceReason: z.string().optional(),
    }),
  }),
]);

export const EnvelopedEventSchema = z.intersection(
  AppEventSchema,
  z.object({ metadata: EventMetadataSchema }),
);

export type EnvelopedEvent = z.infer<typeof EnvelopedEventSchema>;
export type AppEvent = z.infer<typeof AppEventSchema>;
