import {
  pgTable,
  varchar,
  timestamp,
  numeric,
  text,
} from "drizzle-orm/pg-core";
import { auditColumns } from "../audit";

export const posShifts = pgTable("pos_shifts", {
  id: varchar("id", { length: 50 }).primaryKey(),
  branchId: varchar("branch_id", { length: 26 }).notNull(),
  deviceId: varchar("device_id", { length: 255 }).notNull(),
  cashierId: varchar("cashier_id", { length: 26 }).notNull(),
  openedAt: timestamp("opened_at").notNull(),
  closedAt: timestamp("closed_at"),
  startingCash: numeric("starting_cash", { precision: 15, scale: 2 }).notNull(),
  expectedEndingCash: numeric("expected_ending_cash", {
    precision: 15,
    scale: 2,
  }),
  actualEndingCash: numeric("actual_ending_cash", { precision: 15, scale: 2 }),
  difference: numeric("difference", { precision: 15, scale: 2 }),
  differenceReason: text("difference_reason"),
  expectedNonCash: numeric("expected_non_cash", { precision: 15, scale: 2 }),
  actualNonCash: numeric("actual_non_cash", { precision: 15, scale: 2 }),
  nonCashDifference: numeric("non_cash_difference", { precision: 15, scale: 2 }),
  reconciliationNotes: text("reconciliation_notes"),
  businessDate: varchar("business_date", { length: 10 }).notNull().default("1970-01-01"),
  status: varchar("status", { length: 10 }).default("OPEN").notNull(),
  ...auditColumns,
});
