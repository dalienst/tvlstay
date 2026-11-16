"use server";

import { randomBytes } from "node:crypto";
import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { amenities, infoItems, outlets, properties, rooms } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/current";
import { audit } from "@/lib/audit";
import { moveInList, propertyFor } from "@/lib/admin/access";
import { back, bool, emails, imageUrl, int, isTime, opt, slugify, str } from "@/lib/admin/form";

const RESERVED_SLUGS = new Set(["admin", "media", "r", "api", "_next"]);

async function slugTaken(slug: string, exceptId?: number) {
  const where = exceptId ? and(eq(properties.slug, slug), ne(properties.id, exceptId)) : eq(properties.slug, slug);
  const [row] = await getDb().select({ id: properties.id }).from(properties).where(where).limit(1);
  return !!row;
}

// ---------- Properties ----------

export async function createProperty(form: FormData) {
  const user = await requireUser({ roles: ["super_admin"] });
  const name = str(form, "name");
  const slug = slugify(str(form, "slug") || name);
  if (!name || !slug) back("/admin", "Enter a name for the property.", "error");
  if (RESERVED_SLUGS.has(slug) || (await slugTaken(slug))) back("/admin", `The web address "${slug}" is already used.`, "error");
  const [p] = await getDb()
    .insert(properties)
    .values({ name, slug, kind: str(form, "kind") || "hotel", isPublished: false })
    .returning();
  await audit(user, "property_created", name);
  back(`/admin/properties/${p.id}`, `${name} created. It's hidden from guests until you tick "Show to guests".`);
}

export async function updateProperty(form: FormData) {
  const id = int(form, "id")!;
  const { user, property } = await propertyFor(id);
  const path = `/admin/properties/${id}`;
  const name = str(form, "name");
  if (!name) back(path, "The name can't be empty.", "error");
  const checkIn = str(form, "checkIn");
  const checkOut = str(form, "checkOut");
  if ((checkIn && !isTime(checkIn)) || (checkOut && !isTime(checkOut))) back(path, "Use 24-hour times like 12:00 or 10:30.", "error");

  let gallery: string[] = [];
  try {
    gallery = (JSON.parse(str(form, "gallery") || "[]") as unknown[]).filter((u): u is string => typeof u === "string");
  } catch {}

  const values: Partial<typeof properties.$inferInsert> = {
    name,
    kind: str(form, "kind") || property.kind,
    city: opt(form, "city"),
    tagline: opt(form, "tagline"),
    welcome: opt(form, "welcome"),
    about: opt(form, "about"),
    logoUrl: imageUrl(form, "logoUrl"),
    heroImageUrl: imageUrl(form, "heroImageUrl"),
    gallery,
    phone: opt(form, "phone"),
    whatsapp: opt(form, "whatsapp"),
    email: opt(form, "email"),
    address: opt(form, "address"),
    mapQuery: opt(form, "mapQuery"),
    videoUrl: opt(form, "videoUrl"),
    receptionExt: opt(form, "receptionExt"),
    roomServiceExt: opt(form, "roomServiceExt"),
    checkIn: checkIn || null,
    checkOut: checkOut || null,
    wifiName: opt(form, "wifiName"),
    wifiPassword: opt(form, "wifiPassword"),
    reviewUrl: opt(form, "reviewUrl"),
    isPublished: bool(form, "isPublished"),
    requestsEnabled: bool(form, "requestsEnabled"),
    showInOtherGuides: bool(form, "showInOtherGuides"),
    requestsEmail: emails(form, "requestsEmail", path),
    issuesEmail: emails(form, "issuesEmail", path),
    updatedAt: new Date(),
  };
  // Only super admins change the web address, since it's printed on QR codes.
  if (user.role === "super_admin") {
    const slug = slugify(str(form, "slug"));
    if (!slug) back(path, "The web address can't be empty.", "error");
    if (slug !== property.slug && (RESERVED_SLUGS.has(slug) || (await slugTaken(slug, id))))
      back(path, `The web address "${slug}" is already used.`, "error");
    values.slug = slug;
    values.sortOrder = int(form, "sortOrder") ?? property.sortOrder;
  }
  await getDb().update(properties).set(values).where(eq(properties.id, id));
  await audit(user, "property_updated", name);
  back(path, "Saved.");
}

export async function deleteProperty(form: FormData) {
  const user = await requireUser({ roles: ["super_admin"] });
  const id = int(form, "id")!;
  const { property } = await propertyFor(id, user);
  if (str(form, "confirmName") !== property.name)
    back(`/admin/properties/${id}`, `Type the property name exactly ("${property.name}") to delete it.`, "error");
  await getDb().delete(properties).where(eq(properties.id, id));
  await audit(user, "property_deleted", property.name);
  back("/admin", `${property.name} and everything in it was deleted.`);
}

// ---------- Amenities and guest info (same shape: icon, title, text) ----------

type ListKind = "amenities" | "info";
const table = (k: ListKind) => (k === "amenities" ? amenities : infoItems);

export async function saveListItem(form: FormData) {
  const kind = str(form, "kind") as ListKind;
  const propertyId = int(form, "propertyId")!;
  const { user } = await propertyFor(propertyId);
  const path = `/admin/properties/${propertyId}/${kind}`;
  const id = int(form, "id");
  const intent = str(form, "intent");
  const db = getDb();
  const t = table(kind);

  const siblings = await db
    .select({ id: t.id })
    .from(t)
    .where(eq(t.propertyId, propertyId))
    .orderBy(asc(t.sortOrder), asc(t.id));
  const owns = (rowId: number | null) => rowId !== null && siblings.some((s) => s.id === rowId);

  if (intent === "delete" && owns(id)) {
    await db.delete(t).where(eq(t.id, id!));
    await audit(user, `${kind}_deleted`, String(id));
    back(path, "Deleted.");
  }
  if ((intent === "up" || intent === "down") && owns(id)) {
    await moveInList(siblings, id!, intent, (rowId, n) => db.update(t).set({ sortOrder: n }).where(eq(t.id, rowId)));
    back(path, "Order updated.");
  }

  const title = str(form, "title");
  if (!title) back(path, "Enter a title.", "error");
  const icon = str(form, "icon") || (kind === "amenities" ? "check" : "info");
  const text = str(form, "text");
  const isPublished = bool(form, "isPublished");

  if (id && owns(id)) {
    if (kind === "amenities")
      await db.update(amenities).set({ icon, title, description: text || null, isPublished, updatedAt: new Date() }).where(eq(amenities.id, id));
    else await db.update(infoItems).set({ icon, title, body: text, isPublished, updatedAt: new Date() }).where(eq(infoItems.id, id));
    await audit(user, `${kind}_updated`, title);
    back(path, `Saved "${title}".`);
  }
  const sortOrder = siblings.length;
  if (kind === "amenities") await db.insert(amenities).values({ propertyId, icon, title, description: text || null, sortOrder });
  else await db.insert(infoItems).values({ propertyId, icon, title, body: text, sortOrder });
  await audit(user, `${kind}_added`, title);
  back(path, `Added "${title}".`);
}

// ---------- Outlets (restaurants, bars, pools, spa...) ----------

export async function createOutlet(form: FormData) {
  const propertyId = int(form, "propertyId")!;
  const { user } = await propertyFor(propertyId);
  const path = `/admin/properties/${propertyId}/outlets`;
  const name = str(form, "name");
  const slug = slugify(name);
  if (!name || !slug) back(path, "Enter a name.", "error");
  const db = getDb();
  const [taken] = await db
    .select({ id: outlets.id })
    .from(outlets)
    .where(and(eq(outlets.propertyId, propertyId), eq(outlets.slug, slug)));
  if (taken) back(path, `There's already an outlet called "${name}".`, "error");
  const existing = await db.select({ id: outlets.id }).from(outlets).where(eq(outlets.propertyId, propertyId));
  const [o] = await db
    .insert(outlets)
    .values({ propertyId, name, slug, kind: str(form, "kind") || "restaurant", sortOrder: existing.length, isPublished: false })
    .returning();
  await audit(user, "outlet_created", name);
  back(`/admin/outlets/${o.id}`, `${name} created. Add its details and hours, then tick "Show to guests".`);
}

export async function moveOutlet(form: FormData) {
  const propertyId = int(form, "propertyId")!;
  await propertyFor(propertyId);
  const db = getDb();
  const siblings = await db
    .select({ id: outlets.id })
    .from(outlets)
    .where(eq(outlets.propertyId, propertyId))
    .orderBy(asc(outlets.sortOrder), asc(outlets.id));
  const id = int(form, "id")!;
  if (siblings.some((s) => s.id === id)) {
    await moveInList(siblings, id, str(form, "intent") === "up" ? "up" : "down", (rowId, n) =>
      db.update(outlets).set({ sortOrder: n }).where(eq(outlets.id, rowId)),
    );
  }
  back(`/admin/properties/${propertyId}/outlets`, "Order updated.");
}

// ---------- Rooms (per-room QR codes) ----------

const newCode = () => randomBytes(6).toString("base64url");

export async function saveRooms(form: FormData) {
  const propertyId = int(form, "propertyId")!;
  const { user } = await propertyFor(propertyId);
  const path = `/admin/properties/${propertyId}/rooms`;
  const db = getDb();
  const intent = str(form, "intent");
  const id = int(form, "id");
  const [room] = id
    ? await db.select().from(rooms).where(and(eq(rooms.id, id), eq(rooms.propertyId, propertyId)))
    : [undefined];

  if (intent === "toggle" && room) {
    await db.update(rooms).set({ isActive: !room.isActive, updatedAt: new Date() }).where(eq(rooms.id, room.id));
    back(path, `Room ${room.label} ${room.isActive ? "switched off: its QR code now opens the general guide" : "switched on"}.`);
  }
  if (intent === "newcode" && room) {
    await db.update(rooms).set({ code: newCode(), updatedAt: new Date() }).where(eq(rooms.id, room.id));
    await audit(user, "room_code_changed", room.label);
    back(path, `Room ${room.label} has a new QR code. Print and replace the old one, which no longer works.`);
  }
  if (intent === "delete" && room) {
    await db.delete(rooms).where(eq(rooms.id, room.id));
    await audit(user, "room_deleted", room.label);
    back(path, `Room ${room.label} deleted.`);
  }

  // Add: one room per line or separated by commas. "101-110" adds a range.
  const labels = new Set<string>();
  for (const part of str(form, "labels").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)) {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range && Number(range[2]) >= Number(range[1]) && Number(range[2]) - Number(range[1]) <= 500) {
      for (let n = Number(range[1]); n <= Number(range[2]); n++) labels.add(String(n));
    } else labels.add(part.slice(0, 40));
  }
  if (!labels.size) back(path, "Enter at least one room number.", "error");
  const existing = new Set(
    (await db.select({ label: rooms.label }).from(rooms).where(eq(rooms.propertyId, propertyId))).map((r) => r.label),
  );
  const fresh = [...labels].filter((l) => !existing.has(l));
  if (fresh.length) await db.insert(rooms).values(fresh.map((label) => ({ propertyId, label, code: newCode() })));
  await audit(user, "rooms_added", fresh.join(", "));
  back(path, `${fresh.length} room${fresh.length === 1 ? "" : "s"} added${labels.size > fresh.length ? ` (${labels.size - fresh.length} already existed)` : ""}.`);
}
