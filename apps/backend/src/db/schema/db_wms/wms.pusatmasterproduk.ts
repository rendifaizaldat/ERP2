import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { itemStatusEnum, uomEnum } from "./wms.enums";

// ==========================================
// KATEGORI GLOBAL
// ==========================================
export const wmsGlobalCategories = pgTable("wms_global_categories", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),

  // PENAMBAHAN BARU: Kolom status untuk Soft Delete (Arsip)
  status: itemStatusEnum("status").default("ACTIVE").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// MASTER PRODUK GLOBAL
// ==========================================
export const wmsGlobalProducts = pgTable("wms_global_products", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  categoryId: varchar("category_id", { length: 50 })
    .references(() => wmsGlobalCategories.id)
    .notNull(),

  baseUom: uomEnum("base_uom").notNull(),
  status: itemStatusEnum("status").default("ACTIVE").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
