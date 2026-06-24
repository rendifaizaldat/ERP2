import { pgTable, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { devices } from "../master/organization";

export const eventJournal = pgTable("event_journal", {
  id: varchar("id", { length: 36 }).primaryKey(),
  deviceId: varchar("device_id", { length: 26 })
    .references(() => devices.id)
    .notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payload: jsonb("payload").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(), // Waktu masuk ke server
});
