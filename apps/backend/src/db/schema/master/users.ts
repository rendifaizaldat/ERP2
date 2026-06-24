import { pgTable, varchar, boolean } from "drizzle-orm/pg-core";
import { auditColumns } from "../audit";
import { branches } from "./organization";

export const users = pgTable("users", {
  id: varchar("id", { length: 26 }).primaryKey(),
  branchId: varchar("branch_id", { length: 26 })
    .references(() => branches.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  pin: varchar("pin", { length: 6 }),
  role: varchar("role", { length: 50 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...auditColumns,
});
