import {
  pgTable,
  varchar,
  timestamp,
  boolean,
  text,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";

// 1. Tabel Konfigurasi Finansial per Outlet
export const wmsFinancialConfigs = pgTable("wms_financial_configs", {
  branchId: varchar("branch_id", { length: 100 }).primaryKey(), // Terikat langsung dengan ID Outlet
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 })
    .default("0")
    .notNull(),
  serviceRate: numeric("service_rate", { precision: 5, scale: 2 })
    .default("0")
    .notNull(),
  apLimitRate: numeric("ap_limit_rate", { precision: 5, scale: 2 })
    .default("50")
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Tabel Wadah Rekening / E-Wallet
export const wmsWalletAccounts = pgTable("wms_wallet_accounts", {
  id: varchar("id", { length: 100 }).primaryKey(),
  regionId: varchar("region_id", { length: 100 }).notNull(),
  branchId: varchar("branch_id", { length: 100 }).notNull(),
  managedBy: varchar("managed_by", { length: 50 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  bankName: varchar("bank_name", { length: 100 }),
  accountNumber: varchar("account_number", { length: 100 }),
  accountHolder: varchar("account_holder", { length: 100 }),
  accountName: varchar("account_name", { length: 100 }).notNull(),

  // --- KOLOM BARU: Array/JSON berisi metode pembayaran dari POS ---
  binding: jsonb("binding").default([]),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// 3. Tabel Buku Mutasi / Ledger (Double Entry)
export const wmsWalletLedgers = pgTable("wms_wallet_ledgers", {
  id: varchar("id", { length: 100 }).primaryKey(),
  transactionId: varchar("transaction_id", { length: 100 }).notNull(), // ID Pelacakan Jurnal Ganda
  accountId: varchar("account_id", { length: 100 }).notNull(), // Relasi ke wmsWalletAccounts
  branchId: varchar("branch_id", { length: 100 }).notNull(),
  mutationType: varchar("mutation_type", { length: 10 }).notNull(), // 'IN' | 'OUT'
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  referenceType: varchar("reference_type", { length: 50 }).notNull(), // 'POS_SALES' | 'AP_PAYMENT' | 'BANK_TRANSFER' | 'RECONCILIATION'
  referenceId: varchar("reference_id", { length: 100 }), // Relasi ke ID Transaksi Eksternal
  operatorId: varchar("operator_id", { length: 100 }), // Siapa yang eksekusi
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
