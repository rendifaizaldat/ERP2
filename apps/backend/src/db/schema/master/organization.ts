import {
  pgTable,
  varchar,
  timestamp,
  boolean,
  text,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { auditColumns } from "../audit";

export const companies = pgTable("companies", {
  id: varchar("id", { length: 26 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...auditColumns,
});

export const regions = pgTable("regions", {
  id: varchar("id", { length: 26 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...auditColumns,
});

export const branches = pgTable("branches", {
  id: varchar("id", { length: 26 }).primaryKey(),
  companyId: varchar("company_id", { length: 26 })
    .references(() => companies.id)
    .notNull(),
  regionId: varchar("region_id", { length: 26 })
    .references(() => regions.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  address: text("address"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  isActive: boolean("is_active").default(true).notNull(),
  ...auditColumns,
});

export const devices = pgTable("devices", {
  id: varchar("id", { length: 26 }).primaryKey(),
  branchId: varchar("branch_id", { length: 26 })
    .references(() => branches.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  deviceToken: varchar("device_token", { length: 255 }).unique().notNull(),
  status: varchar("status", { enum: ["active", "inactive", "revoked"] })
    .default("active")
    .notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  ...auditColumns,
});
