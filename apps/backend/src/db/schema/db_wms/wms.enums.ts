import { pgEnum } from "drizzle-orm/pg-core";

// ============================================================================
// ENUMS (Standarisasi Status PostgreSQL)
// ============================================================================

export const itemStatusEnum = pgEnum("item_status", ["ACTIVE", "ARCHIVED"]);

export const uomEnum = pgEnum("uom_type", [
  "KG",
  "GRAM",
  "LITER",
  "ML",
  "PCS",
  "BOX",
  "KARUNG",
  "KARTON",
  "PACK",
  "BOTOL",
  "EKOR",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "COMPLETED",
  "CANCELLED",
]);

export const movementTypeEnum = pgEnum("movement_type", [
  "IN_PURCHASE",
  "IN_TRANSFER",
  "OUT_SALE",
  "OUT_TRANSFER",
  "OUT_SPOILAGE",
  "ADJUSTMENT",
]);

export const debtStatusEnum = pgEnum("debt_status", [
  "UNPAID",
  "PARTIAL",
  "PAID",
]);

export const mergeStatusEnum = pgEnum("merge_status", ["UNMERGED", "MERGED"]);
