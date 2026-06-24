import { drizzle } from "drizzle-orm/node-postgres";
import { withReplicas } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as schema from "./schema";

dotenv.config();
const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});
const primaryDb = drizzle(primaryPool, { schema });
const replicaUrl = process.env.READ_DATABASE_URL || process.env.DATABASE_URL;
const replicaPool = new Pool({
  connectionString: replicaUrl,
  max: 40,
});
const readReplicaDb = drizzle(replicaPool, { schema });
export const db = withReplicas(primaryDb, [readReplicaDb]);

console.log(
  "🛢️ Database connection initialized (Primary/Replica Router Active).",
);
