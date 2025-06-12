import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Connection string from Supabase
const connectionString = process.env.DATABASE_URL!;

// Optimize connection pool for Supabase limits
const client = postgres(connectionString, {
  prepare: false,
  max: 10, // Limit concurrent connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  max_lifetime: 60 * 30, // Close connections after 30 minutes
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
