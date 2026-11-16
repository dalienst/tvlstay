"use server";

import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { facilities, facilityServices, spots } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { facilityFor, moveInList, propertyFor } from "@/lib/admin/access";
import { back, bool, emails, imageUrl, int, opt, slugify, str } from "@/lib/admin/form";
import { saveHoursFor } from "@/lib/admin/hours";
import { parsePrice } from "@/lib/menu-text";
import { ICON_NAMES } from "@/components/Icon";

const icon = (v: string) => (ICON_NAMES.includes(v) ? v : "sparkle");

export async function createFacility(form: FormData) {
  const propertyId = int(form, "propertyId")!;
  const { user } = await propertyFor(propertyId);
  const path = `/admin/properties/${propertyId}/facilities`;
  const name = str(form, "name");
  const slug = slugify(name);
  if (!name || !slug) back(path, "Enter a name, e.g. Pools or Housekeeping.", "error");
  const db = getDb();
  const [taken] = await db
    .select({ id: facilities.id })
    .from(facilities)
    .where(and(eq(facilities.propertyId, propertyId), eq(facilities.slug, slug)));
  if (taken) back(path, `There's already a facility called "${name}".`, "error");
  const count = (await db.select({ id: facilities.id }).from(facilities).where(eq(facilities.propertyId, propertyId))).length;
  const [f] = await db
    .insert(facilities)
    .values({ propertyId, name, slug, icon: icon(str(form, "icon")), sortOrder: count, isPublished: false })
    .returning();
  await audit(user, "facility_created", name);
  back(`/admin/facilities/${f.id}`, `${name} created. Add its details and services, then tick "Show to guests".`);
}

export async function moveFacility(form: FormData) {
  const propertyId = int(form, "propertyId")!;
  await propertyFor(propertyId);
  const db = getDb();
  const siblings = await db
    .select({ id: facilities.id })
    .from(facilities)
    .where(eq(facilities.propertyId, propertyId))
    .orderBy(asc(facilities.sortOrder), asc(facilities.id));
  const id = int(form, "id")!;
  if (siblings.some((s) => s.id === id)) {
    await moveInList(siblings, id, str(form, "intent") === "up" ? "up" : "down", (rowId, n) =>
      db.update(facilities).set({ sortOrder: n }).where(eq(facilities.id, rowId)),
    );
  }
  back(`/admin/properties/${propertyId}/facilities`, "Order updated.");
}

export async function updateFacility(form: FormData) {
  const id = int(form, "id")!;
  const { user } = await facilityFor(id);
  const path = `/admin/facilities/${id}`;
  const name = str(form, "name");
  if (!name) back(path, "The name can't be empty.", "error");
  await getDb()
    .update(facilities)
    .set({
      name,
      icon: icon(str(form, "icon")),
      summary: opt(form, "summary"),
      details: opt(form, "details"),
      imageUrl: imageUrl(form, "imageUrl"),
      location: opt(form, "location"),
      extension: opt(form, "extension"),
      notifyEmails: emails(form, "notifyEmails", path),
      isPublished: bool(form, "isPublished"),
      updatedAt: new Date(),
    })
    .where(eq(facilities.id, id));
  await audit(user, "facility_updated", name);
  back(path, "Saved.");
}

export async function deleteFacility(form: FormData) {
  const id = int(form, "id")!;
  const { user, facility } = await facilityFor(id);
  if (str(form, "confirmName") !== facility.name)
    back(`/admin/facilities/${id}`, `Type the name exactly ("${facility.name}") to delete it.`, "error");
  await getDb().delete(facilities).where(eq(facilities.id, id));
  await audit(user, "facility_deleted", facility.name);
  back(`/admin/properties/${facility.propertyId}/facilities`, `${facility.name} was deleted. Past guest requests for it are kept.`);
}

export async function saveFacilityHours(form: FormData) {
  const facilityId = int(form, "facilityId")!;
  const { user } = await facilityFor(facilityId);
  await saveHoursFor(form, { facilityId }, `/admin/facilities/${facilityId}#hours`, user);
}

/** Add, save, reorder or delete one service (e.g. Towel service, Dental kit). */
export async function saveService(form: FormData) {
  const facilityId = int(form, "facilityId")!;
  const { user } = await facilityFor(facilityId);
  const path = `/admin/facilities/${facilityId}#services`;
  const db = getDb();
  const id = int(form, "id");
  const intent = str(form, "intent");
  const siblings = await db
    .select({ id: facilityServices.id })
    .from(facilityServices)
    .where(eq(facilityServices.facilityId, facilityId))
    .orderBy(asc(facilityServices.sortOrder), asc(facilityServices.id));
  const owns = id !== null && siblings.some((s) => s.id === id);

  if (intent === "delete" && owns) {
    await db.delete(facilityServices).where(eq(facilityServices.id, id!));
    await audit(user, "service_deleted", str(form, "name"));
    back(path, "Service removed. Past requests for it are kept.");
  }
  if ((intent === "up" || intent === "down") && owns) {
    await moveInList(siblings, id!, intent, (rowId, n) => db.update(facilityServices).set({ sortOrder: n }).where(eq(facilityServices.id, rowId)));
    back(path, "Order updated.");
  }

  const name = str(form, "name");
  if (!name) back(path, "Give the service a name, e.g. Towel service.", "error");
  let prices: ReturnType<typeof parsePrice> = [];
  try {
    prices = parsePrice(str(form, "prices"));
  } catch (err) {
    back(path, `${name}: ${(err as Error).message}`, "error");
  }
  const values = {
    name,
    description: opt(form, "description"),
    prices,
    priceNote: opt(form, "priceNote"),
    imageUrl: imageUrl(form, "imageUrl"),
    isRequestable: bool(form, "isRequestable"),
    isPublished: bool(form, "isPublished"),
    updatedAt: new Date(),
  };
  if (owns) await db.update(facilityServices).set(values).where(eq(facilityServices.id, id!));
  else await db.insert(facilityServices).values({ ...values, facilityId, sortOrder: siblings.length });
  await audit(user, "service_saved", name);
  back(path, `Saved ${name}.`);
}

const newSpotCode = () => randomBytes(6).toString("base64url"); // 8 chars, unguessable

/** Spots (e.g. Main pool) where staff bring requests; each has its own QR code. */
export async function saveSpot(form: FormData) {
  const facilityId = int(form, "facilityId")!;
  const { user } = await facilityFor(facilityId);
  const path = `/admin/facilities/${facilityId}#spots`;
  const db = getDb();
  const id = int(form, "id");
  const intent = str(form, "intent");
  const siblings = await db
    .select()
    .from(spots)
    .where(eq(spots.facilityId, facilityId))
    .orderBy(asc(spots.sortOrder), asc(spots.id));
  const spot = id !== null ? siblings.find((s) => s.id === id) : undefined;

  if (spot && intent === "delete") {
    await db.delete(spots).where(eq(spots.id, spot.id));
    await audit(user, "spot_deleted", spot.name);
    back(path, `${spot.name} removed. Its printed QR code now opens the general guide.`);
  }
  if (spot && intent === "newcode") {
    await db.update(spots).set({ code: newSpotCode(), updatedAt: new Date() }).where(eq(spots.id, spot.id));
    await audit(user, "spot_code_changed", spot.name);
    back(path, `${spot.name} has a new QR code. Print it and replace the old one, which no longer works.`);
  }
  if (spot && intent === "toggle") {
    await db.update(spots).set({ isActive: !spot.isActive, updatedAt: new Date() }).where(eq(spots.id, spot.id));
    back(path, spot.isActive ? `${spot.name} switched off.` : `${spot.name} switched on.`);
  }
  if (spot && (intent === "up" || intent === "down")) {
    await moveInList(siblings, spot.id, intent, (rowId, n) => db.update(spots).set({ sortOrder: n }).where(eq(spots.id, rowId)));
    back(path, "Order updated.");
  }

  const name = str(form, "name").slice(0, 60);
  if (!name) back(path, "Give the spot a name, e.g. Main pool.", "error");
  if (spot) {
    await db.update(spots).set({ name, updatedAt: new Date() }).where(eq(spots.id, spot.id));
    back(path, `Renamed to ${name}.`);
  }
  if (siblings.some((s) => s.name.toLowerCase() === name.toLowerCase())) back(path, `There's already a spot called "${name}".`, "error");
  await db.insert(spots).values({ facilityId, name, code: newSpotCode(), sortOrder: siblings.length });
  await audit(user, "spot_created", name);
  back(path, `${name} added. Print its QR code from “Print spot QR codes”.`);
}
