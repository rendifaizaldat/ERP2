import { pgTable, text, timestamp, numeric } from "drizzle-orm/pg-core";

export const wmsReceiving = pgTable("wms_receiving", {
  id: text("id").primaryKey(),
  regionId: text("region_id").notNull(),
  branchId: text("branch_id"),
  transactionType: text("transaction_type").notNull(), // "PEMBELIAN_BARANG", "PEMBAYARAN_BIAYA", "MUTASI_PINJAMAN"
  sourceEntity: text("source_entity").notNull(),
  invoiceNumber: text("invoice_number"),
  totalAmount: numeric("total_amount").notNull(),
  paymentStatus: text("payment_status").default("UNPAID").notNull(),
  totalPayment: numeric("total_payment").default("0").notNull(),
  dueDate: timestamp("due_date"),
  status: text("status").default("COMPLETED").notNull(),
  receivedAt: timestamp("received_at").notNull(),
  proofOfTransaction: text("proof_of_transaction"), // Tambahan: Lampiran Struk/Nota

  // --- NEW FIELDS FOR AP OUTLET & MUTASI ---
  paymentMethod: text("payment_method"), // "CASH" | "TEMPO" | "MUTASI"
  fundingSource: text("funding_source"), // "PETTY_CASH" | "KASIR" | "PRIBADI"
  mutationType: text("mutation_type"), // "INTRA_REGION" | "CROSS_REGION"
  targetRegionId: text("target_region_id"),
  loanStatus: text("loan_status"), // "OPEN" | "CLOSED_GOODS" | "CLOSED_CASH"
  returnMethod: text("return_method"), // "PENDING" | "GOODS" | "CASH"
  // -----------------------------------------

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wmsReceivingItems = pgTable("wms_receiving_items", {
  id: text("id").primaryKey(),
  receivingId: text("receiving_id").notNull(),
  regionalItemId: text("regional_item_id").notNull(),
  itemName: text("item_name").notNull(),
  uom: text("uom").notNull(),
  qty: numeric("qty").notNull(),
  price: numeric("price").notNull(),
  subtotal: numeric("subtotal").notNull(),
});

export const wmsPayments = pgTable("wms_payments", {
  id: text("id").primaryKey(),
  receivingId: text("receiving_id").notNull(),
  amount: numeric("amount").notNull(),
  status: text("status").default("SUCCESS").notNull(), // SUCCESS | VOID
  depositAmount: numeric("deposit_amount").default("0").notNull(),
  externalAmount: numeric("external_amount").default("0").notNull(),

  // --- NEW FIELDS FOR AP OUTLET PAYMENT ---
  paymentMethod: text("payment_method"), // "CASH" | "TRANSFER" | "GOODS" (Jika lunas pakai barang)
  fundingSource: text("funding_source"), // "PETTY_CASH" | "KASIR" | "PRIBADI"
  // ----------------------------------------

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  proofOfTransfer: text("proof_of_transfer"),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wmsOutletBalances = pgTable("wms_outlet_balances", {
  outletId: text("outlet_id").primaryKey(),
  balance: numeric("balance").default("0").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wmsOutletBalanceMutations = pgTable(
  "wms_outlet_balance_mutations",
  {
    id: text("id").primaryKey(),
    outletId: text("outlet_id").notNull(),
    mutationType: text("mutation_type").notNull(),
    amount: numeric("amount").notNull(),
    balanceAfter: numeric("balance_after").notNull(),
    referenceId: text("reference_id"),
    notes: text("notes"),
    proofOfTransfer: text("proof_of_transfer"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);
