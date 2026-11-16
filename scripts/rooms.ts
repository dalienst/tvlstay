// Adds rooms to a property and writes a printable QR code for each one.
//
//   npm run rooms -- village 101 102 103 A1 A2     add rooms (existing ones are kept)
//   npm run rooms -- village                       just (re)write the QR codes
//
// QR codes go to ./qr/<property>/ as SVG (crisp at any print size), plus general.svg
// for the general code. Set APP_URL in .env.local to the live address first, e.g.
// APP_URL=https://stay.tamarind.co.ke, or the codes will point at localhost.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { getDb } from "../lib/db/db";
import { properties, rooms } from "../lib/db/schema";

for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(f);
  } catch {}
}

const newCode = () => randomBytes(6).toString("base64url"); // 8 chars, unguessable

async function main() {
  const [slug, ...labels] = process.argv.slice(2);
  if (!slug) throw new Error("Usage: npm run rooms -- <property-slug> [room labels...]");
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const db = getDb();
  const [property] = await db.select().from(properties).where(eq(properties.slug, slug));
  if (!property) throw new Error(`No property "${slug}"`);

  for (const label of labels) {
    const [existing] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.propertyId, property.id), eq(rooms.label, label)));
    if (!existing) await db.insert(rooms).values({ propertyId: property.id, label, code: newCode() });
  }

  const all = await db.select().from(rooms).where(eq(rooms.propertyId, property.id)).orderBy(asc(rooms.label));
  const dir = join(process.cwd(), "qr", slug);
  mkdirSync(dir, { recursive: true });
  const opts = { type: "svg" as const, margin: 2, errorCorrectionLevel: "M" as const, color: { dark: "#1f1615", light: "#ffffff" } };
  writeFileSync(join(dir, "general.svg"), await QRCode.toString(`${appUrl}/${slug}`, opts));
  for (const r of all) {
    writeFileSync(join(dir, `room-${r.label}.svg`), await QRCode.toString(`${appUrl}/r/${r.code}`, opts));
  }
  console.log(`${all.length} room codes and the general code written to qr/${slug}/ (pointing at ${appUrl}).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
