import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { sslFor } from "./ssl.mjs";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!dbInstance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set.");
    const client = postgres(url, {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10,
      onnotice: () => {},
      ssl: sslFor(url),
    });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}
