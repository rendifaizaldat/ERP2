import { timestamp, integer } from "drizzle-orm/pg-core";

export const auditColumns = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  version: integer("version").default(1).notNull(),
};
