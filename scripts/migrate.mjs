// Applies any new SQL migrations in ./drizzle, then exits. Safe to run on every deploy:
// migrations already applied are skipped. Plain JS with runtime dependencies only.
//
// Runs automatically on Railway as the pre-deploy command (see railway.json): after the new
// version builds and before it goes live. If a migration fails, the deploy stops and the
// running site is untouched. Locally:  npm run db:migrate
import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { sslFor } from "../lib/db/ssl.mjs";

for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const client = postgres(url, { max: 1, ssl: sslFor(url), onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("Database is up to date.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}
