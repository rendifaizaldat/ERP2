import {
  pgTable,
  varchar,
  integer,
  timestamp,
  pgEnum,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { branches, users, products } from "../index"; // Pastikan path ini mengarah ke file master index Anda

// ============================================================================
// ENUMS: Mendefinisikan status yang diizinkan agar database konsisten
// ============================================================================
export const orderStatusEnum = pgEnum("order_status", [
  "open",
  "cooking",
  "served",
  "completed",
  "cancelled",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "unpaid",
  "partial",
  "paid",
  "void",
  "refunded",
  "complimentary",
]);

// Enum Pembayaran Diperbarui untuk Spesifikasi Rekonsiliasi WMS
export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "CARD",
  "QRIS",
  "EWALLET",
  "BANK_TRANSFER",
]);

export const paymentCaptureModeEnum = pgEnum("payment_capture_mode", [
  "MANUAL",
  "INTEGRATED",
]);

export const paymentProviderEnum = pgEnum("payment_provider", [
  "BCA_EDC",
  "MANDIRI_EDC",
  "MIDTRANS",
  "XENDIT",
  "STRIPE",
  "ADYEN",
  "VERIFONE",
  "INGENICO",
]);

export const pettyCashStatusEnum = pgEnum("petty_cash_status", [
  "ON_PROCESS", // Uang keluar, nota/kembalian belum diserahkan
  "COMPLETED", // Nota/kembalian sudah diserahkan dan dikunci
]);

// ============================================================================
// LAYER 1: ORDERS (Fokus pada Operasional Dapur & Meja)
// ============================================================================
export const orders = pgTable("orders", {
  id: varchar("id", { length: 26 }).primaryKey(), // ULID
  branchId: varchar("branch_id", { length: 26 })
    .references(() => branches.id)
    .notNull(),
  operatorId: varchar("operator_id", { length: 26 })
    .references(() => users.id)
    .notNull(),

  // tableLabel menyimpan nama meja atau Virtual Table (contoh: "MEJA 4" atau "MEJA 4-TAMU A")
  tableLabel: varchar("table_label", { length: 50 }).notNull(),
  customerName: varchar("customer_name", { length: 100 }), // Opsional, bisa untuk Takeaway
  guestCount: integer("guest_count").default(1).notNull(),

  status: orderStatusEnum("status").default("open").notNull(),
  businessDate: varchar("business_date", { length: 10 }).notNull().default("1970-01-01"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItemStatusEnum = pgEnum("order_item_status", [
  "PENDING",
  "COOKING",
  "SERVED",
]);

export const orderItems = pgTable("order_items", {
  id: varchar("id", { length: 26 }).primaryKey(), // ULID
  orderId: varchar("order_id", { length: 26 })
    .references(() => orders.id)
    .notNull(),
  productId: varchar("product_id", { length: 26 })
    .references(() => products.id)
    .notNull(),

  // Snapshot Data (Mencegah harga historis berubah jika master produk diubah)
  skuSnapshot: varchar("sku_snapshot", { length: 50 }).notNull(),
  nameSnapshot: varchar("name_snapshot", { length: 150 }).notNull(),
  basePriceSnapshot: integer("base_price_snapshot").notNull(),

  qty: integer("qty").notNull(),
  // Arsitektur 3-Lapis: tracking void & refund per item
  voidedQty: integer("voided_qty").default(0).notNull(),
  refundedQty: integer("refunded_qty").default(0).notNull(),
  status: orderItemStatusEnum("status").default("PENDING").notNull(),
  voidReason: varchar("void_reason", { length: 50 }),

  notes: varchar("notes", { length: 255 }), // Catatan: "Pedas", "Tanpa Es"
  isVoided: boolean("is_voided").default(false).notNull(), // Legacy flag

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// LAYER 2: INVOICES (Fokus pada Matematika Keuangan & Pajak)
// ============================================================================
export const invoices = pgTable("invoices", {
  id: varchar("id", { length: 26 }).primaryKey(), // ULID
  branchId: varchar("branch_id", { length: 26 })
    .references(() => branches.id)
    .notNull(),
  orderId: varchar("order_id", { length: 26 }).references(() => orders.id), // Bisa null jika ini murni DP (Pesan Tempat)

  invoiceNumber: varchar("invoice_number", { length: 50 }).unique().notNull(), // Contoh: INV-020626-0001

  // Kalkulasi Keuangan Dinamis
  subtotal: integer("subtotal").default(0).notNull(),
  taxRate: integer("tax_rate").default(0).notNull(), // Persentase (contoh: 11)
  taxAmount: integer("tax_amount").default(0).notNull(),
  serviceRate: integer("service_rate").default(0).notNull(), // Persentase (contoh: 5)
  serviceAmount: integer("service_amount").default(0).notNull(),
  discountAmount: integer("discount_amount").default(0).notNull(),

  grandTotal: integer("grand_total").default(0).notNull(),

  status: invoiceStatusEnum("status").default("unpaid").notNull(),
  notes: varchar("notes", { length: 255 }), // Alasan jika Complimentary atau Void
  businessDate: varchar("business_date", { length: 10 }).notNull().default("1970-01-01"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// LAYER 3: PAYMENTS (Fokus pada Aliran Uang Masuk & Split Payment)
// ============================================================================
export const payments = pgTable("payments", {
  id: varchar("id", { length: 26 }).primaryKey(), // ULID
  branchId: varchar("branch_id", { length: 26 })
    .references(() => branches.id)
    .notNull(),
  invoiceId: varchar("invoice_id", { length: 26 })
    .references(() => invoices.id)
    .notNull(),
  operatorId: varchar("operator_id", { length: 26 })
    .references(() => users.id)
    .notNull(), // Kasir yang menerima uang

  // Spesifikasi Inti Pembayaran WMS
  method: paymentMethodEnum("method").notNull(),
  captureMode: paymentCaptureModeEnum("capture_mode")
    .default("MANUAL")
    .notNull(),
  provider: paymentProviderEnum("provider"), // Nullable jika berupa CASH murni

  amountPaid: integer("amount_paid").notNull(), // Uang yang diserahkan pelanggan
  changeAmount: integer("change_amount").default(0).notNull(), // Kembalian (hanya untuk CASH)

  // METADATA REKONSILIASI BANK
  referenceNumber: varchar("reference_number", { length: 100 }), // Legacy reference (bisa dipakai untuk nomor transfer manual)
  approvalCode: varchar("approval_code", { length: 50 }), // Diisi manual (kasir) atau otomatis (API Cloud)
  rrn: varchar("rrn", { length: 50 }), // Retrieval Reference Number dari EDC
  traceNumber: varchar("trace_number", { length: 50 }), // Trace Number setruk EDC
  batchNumber: varchar("batch_number", { length: 50 }), // Nomor Batch Settlement EDC

  // JSONB Fleksibel untuk muatan payload mentah API Gateway
  settlementMetadata: jsonb("settlement_metadata"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// LAYER 3B: REFUNDS (Pembalikan Pembayaran — uang keluar ke pelanggan)
// ============================================================================
export const refundMethodEnum = pgEnum("refund_method", [
  "CASH",
  "CARD",
  "QRIS",
  "EWALLET",
  "BANK_TRANSFER",
]);

export const refunds = pgTable("refunds", {
  id: varchar("id", { length: 26 }).primaryKey(), // ULID / refundId dari PWA
  branchId: varchar("branch_id", { length: 26 })
    .references(() => branches.id)
    .notNull(),
  invoiceId: varchar("invoice_id", { length: 26 })
    .references(() => invoices.id)
    .notNull(),
  operatorId: varchar("operator_id", { length: 26 })
    .references(() => users.id)
    .notNull(),

  refundMethod: refundMethodEnum("refund_method").notNull(),
  totalRefundAmount: integer("total_refund_amount").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),

  // JSONB: Array item yang direfund [{productId, sku, qtyRefunded, amountRefunded}]
  itemsJson: jsonb("items_json").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// LAYER 4: PETTY CASH KASIR (Operasional Harian Uang Keluar Laci)
// ============================================================================
export const pettyCashKasir = pgTable("petty_cash_kasir", {
  id: varchar("id", { length: 50 }).primaryKey(), // Menggunakan Petty Cash ID dari PWA: PC-171630123
  branchId: varchar("branch_id", { length: 26 })
    .references(() => branches.id)
    .notNull(),

  // Siapa yang meminta dana
  requesterName: varchar("requester_name", { length: 150 }).notNull(),
  requesterDivision: varchar("requester_division", { length: 100 }).notNull(),
  notes: varchar("notes", { length: 255 }).notNull(),

  // Data Kasir yang memberikan uang laci (Membuka Shift)
  cashierIssuedId: varchar("cashier_issued_id", { length: 26 })
    .references(() => users.id)
    .notNull(),
  amountRequested: integer("amount_requested").notNull(),
  issuedAt: timestamp("issued_at").notNull(),

  // Data Kasir yang menerima penyelesaian/nota (Bisa berbeda dengan yang memberi jika ganti shift)
  status: pettyCashStatusEnum("status").default("ON_PROCESS").notNull(),
  cashierResolvedId: varchar("cashier_resolved_id", { length: 26 }).references(
    () => users.id,
  ),
  amountReturned: integer("amount_returned").default(0),
  hasReceipt: boolean("has_receipt").default(false),
  resolvedAt: timestamp("resolved_at"),
});

// ============================================================================
// POS LEDGERS (Arus Kas)
// ============================================================================
export const posLedgers = pgTable("pos_ledgers", {
  id: varchar("id", { length: 50 }).primaryKey(),
  branchId: varchar("branch_id", { length: 50 })
    .references(() => branches.id)
    .notNull(),
  operatorId: varchar("operator_id", { length: 50 })
    .references(() => users.id)
    .notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'CREDIT' | 'DEBIT'
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  referenceId: varchar("reference_id", { length: 50 }), // Bisa invoice_id, petty_cash_id, refund_id
  sourceEvent: varchar("source_event", { length: 50 }).notNull(), // SALE_CREATED, PETTY_CASH_ISSUED, PAYMENT_REFUNDED
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ============================================================================
// LAYER 5: AUDIT LOGS (Jejak Rekam Keamanan & Fraud Detection)
// ============================================================================
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 26 }).primaryKey(), // ULID
  branchId: varchar("branch_id", { length: 26 })
    .references(() => branches.id)
    .notNull(),

  // Pelaku tindakan
  operatorId: varchar("operator_id", { length: 26 })
    .references(() => users.id)
    .notNull(),

  // Manager yang memberikan PIN persetujuan (Nullable, jika tindakan tidak butuh PIN manajer)
  managerId: varchar("manager_id", { length: 26 }).references(() => users.id),

  // Tipe Event (Contoh: "ORDER_VOIDED", "ORDER_REFUNDED", "EOD_PROCESSED")
  eventType: varchar("event_type", { length: 50 }).notNull(),

  // Referensi (Contoh: "INV-020626-0001", "MEJA 4", atau "EOD-SHIFT-1")
  referenceId: varchar("reference_id", { length: 100 }).notNull(),

  // Catatan alasan (Wajib diisi oleh kasir/manager saat kejadian)
  reason: varchar("reason", { length: 255 }).notNull(),

  // Menyimpan struktur JSON asli dari PWA untuk bukti audit absolut
  // (Contoh: { "qtyToVoid": 2, "sku": "SKU1", "refundType": "BARANG_KOSONG" })
  payloadHash: jsonb("payload_hash").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
