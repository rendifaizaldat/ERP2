import { pgTable, text, boolean, jsonb } from "drizzle-orm/pg-core";

export const wmsVendors = pgTable("wms_vendors", {
  id: text("id").primaryKey(),
  regionId: text("region_id").notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  address: text("address"),
  bankName: text("bank_name"),
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  certifications: jsonb("certifications").$type<string[]>(),
  contractFileUrl: text("contract_file_url"),
  isActive: boolean("is_active").default(true).notNull(),
});
