import {
  pgTable,
  varchar,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { wmsGlobalProducts } from "./wms.pusatmasterproduk";
import { itemStatusEnum, mergeStatusEnum } from "./wms.enums";

// ==========================================
// ITEM REGIONAL & ANTREAN MERGE
// ==========================================
export const wmsRegionalItems = pgTable("wms_regional_items", {
  id: varchar("id", { length: 50 }).primaryKey(),
  regionId: varchar("region_id", { length: 50 }).notNull(),

  // NEW: Membedakan data level Region (null) dan level Outlet (terisi)
  branchId: varchar("branch_id", { length: 50 }),

  localName: varchar("local_name", { length: 255 }).notNull(),
  localCategory: varchar("local_category", { length: 255 }),
  uom: varchar("uom", { length: 50 }).notNull(),
  purchasePrice: numeric("purchase_price", {
    precision: 12,
    scale: 2,
  }).notNull(),
  margin: numeric("margin", { precision: 5, scale: 2 }).notNull().default("0"),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  globalId: varchar("global_id", { length: 50 }).references(
    () => wmsGlobalProducts.id,
  ),

  mergeStatus: mergeStatusEnum("merge_status").default("UNMERGED").notNull(),
  status: itemStatusEnum("status").default("ACTIVE").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
