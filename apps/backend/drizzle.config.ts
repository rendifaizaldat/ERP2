import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load .env
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

export default defineConfig({
  schema: "./src/db/schema/**/*.ts", // Membaca semua file skema kita
  out: "./src/db/migrations", // Tempat menyimpan riwayat migrasi SQL
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
