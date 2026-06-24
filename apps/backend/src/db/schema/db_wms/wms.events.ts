import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const wmsProcessedEvents = pgTable("wms_processed_events", {
  eventId: text("event_id").primaryKey(),
  aggregateId: text("aggregate_id").notNull(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});
