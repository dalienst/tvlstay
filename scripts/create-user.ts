// Creates a staff account. Use it once for the first super admin, then add others in the admin panel.
//   npm run create-user -- --email you@tamarind.co.ke --name "Your Name"
// Prints a temporary password; you choose your own at first sign-in. Sends no email.
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db/db";
import { users } from "../lib/db/schema";

for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(f);
  } catch {}
}

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  if (!email || !name) throw new Error('Usage: npm run create-user -- --email you@tamarind.co.ke --name "Your Name"');
  const db = getDb();
  const [exists] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (exists) throw new Error(`${email} already has an account.`);
  const password = randomBytes(9).toString("base64url");
  await db.insert(users).values({
    id: randomUUID(),
    name,
    email,
    role: "super_admin",
    passwordHash: await bcrypt.hash(password, 12),
    mustChangePassword: true,
  });
  console.log(`Created super admin ${email}. Temporary password: ${password}`);
  console.log("Sign in at /admin/login; you'll be asked to choose your own password.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    const cause = e?.cause?.message ?? "";
    console.error(e.message + (cause ? `\nCause: ${cause}` : ""));
    if (/does not exist/.test(cause)) console.error("The tables are missing. Run `npm run db:migrate` first.");
    process.exit(1);
  });
