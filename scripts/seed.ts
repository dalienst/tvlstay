// Loads the starting content: Tamarind Village, its facilities, the Harbour restaurant and its menus,
// plus Tamarind Mombasa (hidden from guests for now) which owns the beverage menu and
// wine list that Harbour shares.
//
//   npm run db:seed            fills an empty database; on one with content, only adds
//                              starting content that's missing (e.g. Tamarind's food menu)
//   npm run db:seed -- --reset wipes ALL compendium content first (development only)
//
// Sends no emails or messages.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../lib/db/db";
import {
  amenities,
  facilities,
  facilityServices,
  infoItems,
  menuItems,
  menuSections,
  menuShares,
  menus,
  openingHours,
  outlets,
  properties,
} from "../lib/db/schema";
import { parseMenuText } from "../lib/menu-text";

if (process.env.NODE_ENV !== "production") {
  for (const f of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(f);
    } catch {}
  }
}

const db = getDb();
const dataDir = join(process.cwd(), "scripts", "data");

async function addMenu(outletId: number, slug: string, files: string[], sortOrder: number, extra: Partial<typeof menus.$inferInsert> = {}) {
  const parsed = files.map((f) => parseMenuText(readFileSync(join(dataDir, f), "utf8")));
  const [menu] = await db
    .insert(menus)
    .values({ outletId, slug, name: parsed[0].name, servedNote: parsed[0].servedNote, sortOrder, ...extra })
    .returning();
  let s = 0;
  for (const section of parsed.flatMap((p) => p.sections)) {
    const [row] = await db
      .insert(menuSections)
      .values({ menuId: menu.id, name: section.name, description: section.description, sortOrder: s++ })
      .returning();
    if (section.items.length) {
      await db.insert(menuItems).values(
        section.items.map((item, i) => ({
          sectionId: row.id,
          name: item.name,
          description: item.description,
          prices: item.prices,
          tags: item.tags,
          sortOrder: i,
        })),
      );
    }
  }
  return menu;
}

const TAMARIND_FOOTNOTE = "Prices include 16% VAT, 2% training levy and 10% service charge.";

/** Tamarind Restaurant's food menu (added 16 Nov 2026). */
async function addTamarindFood(outletId: number) {
  return addMenu(outletId, "food", ["tamarind-food.txt"], 0, { footnote: TAMARIND_FOOTNOTE });
}

/**
 * On a database that already has content: adds starting content that came later, only if it's
 * missing. Never changes or deletes anything staff have edited.
 */
async function topUp() {
  const [restaurant] = await db
    .select({ id: outlets.id })
    .from(outlets)
    .innerJoin(properties, eq(properties.id, outlets.propertyId))
    .where(and(eq(properties.slug, "mombasa"), eq(outlets.slug, "restaurant")));
  if (!restaurant) return console.log("Tamarind Restaurant isn't in the database, so its food menu wasn't added.");
  const [has] = await db.select({ id: menus.id }).from(menus).where(and(eq(menus.outletId, restaurant.id), eq(menus.slug, "food")));
  if (has) return console.log("Nothing to add: Tamarind Restaurant already has its food menu.");
  await addTamarindFood(restaurant.id);
  console.log("Added Tamarind Restaurant's food menu (hidden from guests until Tamarind Mombasa is shown).");
}

async function main() {
  const reset = process.argv.includes("--reset");
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(properties);
  if (count > 0 && !reset) {
    console.log("The database already has content, so only missing starting content is added. Use --reset to start over (deletes everything).");
    await topUp();
    return;
  }
  if (reset) {
    await db.execute(sql`truncate properties restart identity cascade`);
    console.log("Cleared existing content.");
  }

  // ---------- Tamarind Village ----------
  const [village] = await db
    .insert(properties)
    .values({
      slug: "village",
      name: "Tamarind Village",
      kind: "apartments",
      city: "Mombasa",
      tagline: "Fully serviced apartments overlooking Mombasa's Old Harbour",
      welcome:
        "Karibu! Tamarind Village is a serene coastal retreat overlooking Mombasa's Old Town and harbour. Blending Swahili-inspired architecture with modern luxury, every apartment includes professional staff services and full access to our harbour-side amenities. Everything you need for your stay is right here.",
      logoUrl: "/logos/tvllogo.png",
      heroImageUrl: "/images/apartment-living.jpg",
      gallery: ["/images/apartment-living.jpg", "/images/apartment-dining.jpg", "/images/apartment-bedroom.jpg"],
      phone: "+254 725 959 552",
      whatsapp: "+254725959552",
      email: "reservations.village@tamarind.co.ke",
      address: "Cement Silos, Mkomani Road, Nyali, Mombasa",
      mapQuery: "Tamarind Village, Mkomani Road, Mombasa",
      receptionExt: "325",
      roomServiceExt: "314",
      checkIn: "12:00",
      checkOut: "10:30",
      sortOrder: 0,
    })
    .returning();

  await db.insert(amenities).values(
    [
      ["wifi", "High-speed Wi-Fi", "Your Wi-Fi details are given at check-in."],
      ["wind", "Whisper-quiet air conditioning", null],
      ["chef", "Fully equipped kitchenette", "With granite countertops."],
      ["sun", "Private veranda", "Overlooking the creek."],
      ["tv", "Satellite TV", "DStv and smart channels."],
      ["lock", "In-room safe", "Plus a tea and coffee station."],
      ["phone", "Direct phone line & intercom", null],
      ["sparkle", "Daily housekeeping", "With evening turndown service."],
    ].map(([icon, title, description], i) => ({ propertyId: village.id, icon: icon!, title: title!, description, sortOrder: i })),
  );

  await db.insert(infoItems).values(
    [
      ["clock", "Check-in & check-out", "Check-in is from 12 noon. Check-out is by 10:30am. If you need a late check-out, please ask reception and we'll do our best to help."],
      ["wifi", "Wi-Fi", "Your Wi-Fi network and password are given at check-in. Ask reception if you need them again."],
      ["bell", "Room service", "Hungry? Dial extension 314 from your room phone to order from the Harbour restaurant menu."],
      ["sparkle", "Housekeeping", "Your apartment is serviced daily, with an evening turndown service."],
    ].map(([icon, title, body], i) => ({ propertyId: village.id, icon, title, body, sortOrder: i })),
  );

  // Facilities: what guests can ask for. Details, photos and hours are added in the admin panel.
  const [pools, housekeeping] = await db
    .insert(facilities)
    .values([
      { propertyId: village.id, slug: "pools", name: "Pools", icon: "pool", sortOrder: 0 },
      {
        propertyId: village.id,
        slug: "housekeeping",
        name: "Housekeeping",
        icon: "sparkle",
        summary: "Your apartment is serviced daily, with an evening turndown service.",
        sortOrder: 1,
      },
    ])
    .returning();
  await db.insert(facilityServices).values([
    { facilityId: pools.id, name: "Towel service", sortOrder: 0 },
    { facilityId: housekeeping.id, name: "Cleaning", sortOrder: 0 },
    { facilityId: housekeeping.id, name: "Dental kit", sortOrder: 1 },
    { facilityId: housekeeping.id, name: "Sewing kit", sortOrder: 2 },
  ]);

  const [harbour] = await db
    .insert(outlets)
    .values({
      propertyId: village.id,
      slug: "harbour",
      name: "Harbour Restaurant",
      kind: "restaurant",
      description: "All-day dining at the Village, from a full breakfast to a relaxed dinner with views over the harbour.",
      imageUrl: "/images/harbour-terrace.jpg",
      extension: "314",
      location: "Tamarind Village",
      sortOrder: 0,
    })
    .returning();
  await db.insert(openingHours).values([
    { outletId: harbour.id, label: "Breakfast", opens: "05:00", closes: "11:00", sortOrder: 0 },
    { outletId: harbour.id, label: "All day menu", opens: "11:00", closes: "22:00", sortOrder: 1 },
  ]);
  await addMenu(harbour.id, "breakfast", ["harbour-p1.txt"], 0);
  await addMenu(harbour.id, "all-day", ["harbour-p2.txt"], 1);

  // ---------- Tamarind Mombasa (hidden until Phase 3) ----------
  const [mombasa] = await db
    .insert(properties)
    .values({
      slug: "mombasa",
      name: "Tamarind Mombasa",
      kind: "restaurant",
      city: "Mombasa",
      tagline: "Seafood and sundowners above the Old Harbour",
      phone: "+254 725 959 552",
      email: "reservations.mombasa@tamarind.co.ke",
      address: "Cement Silos, Mkomani Road, Nyali, Mombasa",
      sortOrder: 1,
      isPublished: false,
    })
    .returning();
  const [restaurant] = await db
    .insert(outlets)
    .values({
      propertyId: mombasa.id,
      slug: "restaurant",
      name: "Tamarind Restaurant",
      kind: "restaurant",
      description:
        "An exceptional seafood experience in a sophisticated coastal setting, showcasing the finest Indian Ocean flavours.",
      sortOrder: 0,
    })
    .returning();
  await db.insert(openingHours).values({ outletId: restaurant.id, label: "Lunch & dinner", opens: "11:00", closes: "24:00" });
  await addTamarindFood(restaurant.id);
  const beverages = await addMenu(restaurant.id, "beverages", ["beverages.txt"], 10);
  const wine = await addMenu(restaurant.id, "wine-list", ["wine.txt"], 11);

  // Harbour shows the same beverage menu and wine list.
  await db.insert(menuShares).values([
    { menuId: beverages.id, outletId: harbour.id, sortOrder: 10 },
    { menuId: wine.id, outletId: harbour.id, sortOrder: 11 },
  ]);

  const [{ items }] = await db.select({ items: sql<number>`count(*)::int` }).from(menuItems);
  console.log(`Seeded Tamarind Village, Harbour Restaurant and ${items} menu items.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
