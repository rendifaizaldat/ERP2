import { pgTable, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { auditColumns } from "../audit";
import { branches } from "../master/organization";

export const productCategories = pgTable("product_categories", {
  id: varchar("id", { length: 26 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...auditColumns,
});

export const products = pgTable("products", {
  id: varchar("id", { length: 26 }).primaryKey(),
  categoryId: varchar("category_id", { length: 26 })
    .references(() => productCategories.id)
    .notNull(),
  sku: varchar("sku", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  basePrice: integer("base_price").notNull(), // Harga modal pusat / acuan dasar awal
  isFnb: boolean("is_fnb").default(true).notNull(), // Jembatan Filter BOM untuk WMS nanti
  isActive: boolean("is_active").default(true).notNull(),
  ...auditColumns,
});

export const branchProducts = pgTable("branch_products", {
  id: varchar("id", { length: 26 }).primaryKey(),
  branchId: varchar("branch_id", { length: 26 })
    .references(() => branches.id)
    .notNull(),
  productId: varchar("product_id", { length: 26 })
    .references(() => products.id)
    .notNull(),
  salePrice: integer("sale_price").notNull(), // Harga jual aktual cabang bersangkutan
  isActive: boolean("is_active").default(true).notNull(),
  ...auditColumns,
});
