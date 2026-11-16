// Loads a record for the admin panel and checks the signed-in user may edit it.
// Every admin page and server action goes through one of these, so a property admin
// can't reach another property, and an outlet manager can't reach another outlet,
// even by editing a URL or a hidden form field.
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { facilities, facilityServices, menuItems, menuSections, menus, outlets, properties } from "@/lib/db/schema";
import { requireUser, type CurrentUser } from "@/lib/auth/current";
import { canEditOutlet, canEditProperty } from "@/lib/auth/roles";

export async function propertyFor(id: number, user?: CurrentUser) {
  const u = user ?? (await requireUser());
  if (!Number.isFinite(id)) notFound();
  const [p] = await getDb().select().from(properties).where(eq(properties.id, id)).limit(1);
  if (!p) notFound();
  if (!canEditProperty(u, p.id)) redirect("/admin");
  return { user: u, property: p };
}

export async function outletFor(id: number, user?: CurrentUser) {
  const u = user ?? (await requireUser());
  if (!Number.isFinite(id)) notFound();
  const [o] = await getDb().select().from(outlets).where(eq(outlets.id, id)).limit(1);
  if (!o) notFound();
  if (!canEditOutlet(u, o)) redirect("/admin");
  const [p] = await getDb().select().from(properties).where(eq(properties.id, o.propertyId)).limit(1);
  return { user: u, outlet: o, property: p };
}

/** A menu is edited through the outlet that owns it. */
export async function menuFor(id: number, user?: CurrentUser) {
  const u = user ?? (await requireUser());
  if (!Number.isFinite(id)) notFound();
  const [m] = await getDb().select().from(menus).where(eq(menus.id, id)).limit(1);
  if (!m) notFound();
  const { outlet, property } = await outletFor(m.outletId, u);
  return { user: u, menu: m, outlet, property };
}

export async function sectionFor(id: number, user?: CurrentUser) {
  const u = user ?? (await requireUser());
  const [s] = await getDb().select().from(menuSections).where(eq(menuSections.id, id)).limit(1);
  if (!s) notFound();
  return { ...(await menuFor(s.menuId, u)), section: s };
}

export async function itemFor(id: number, user?: CurrentUser) {
  const u = user ?? (await requireUser());
  const [i] = await getDb().select().from(menuItems).where(eq(menuItems.id, id)).limit(1);
  if (!i) notFound();
  return { ...(await sectionFor(i.sectionId, u)), item: i };
}

/** Facilities (pools, housekeeping...) are managed by the property's admins. */
export async function facilityFor(id: number, user?: CurrentUser) {
  const u = user ?? (await requireUser());
  if (!Number.isFinite(id)) notFound();
  const [f] = await getDb().select().from(facilities).where(eq(facilities.id, id)).limit(1);
  if (!f) notFound();
  const { property } = await propertyFor(f.propertyId, u);
  return { user: u, facility: f, property };
}

export async function serviceFor(id: number, user?: CurrentUser) {
  const u = user ?? (await requireUser());
  if (!Number.isFinite(id)) notFound();
  const [s] = await getDb().select().from(facilityServices).where(eq(facilityServices.id, id)).limit(1);
  if (!s) notFound();
  return { ...(await facilityFor(s.facilityId, u)), service: s };
}

/** Properties the user can open in the admin panel. */
export async function accessibleProperties(user: CurrentUser) {
  const db = getDb();
  if (user.role === "super_admin") return db.select().from(properties).orderBy(asc(properties.sortOrder), asc(properties.name));
  if (user.role === "property_admin" && user.propertyId)
    return db.select().from(properties).where(eq(properties.id, user.propertyId));
  return [];
}

/**
 * Moves one row up or down among its siblings by rewriting sortOrder as 0, 1, 2...
 * `siblings` must already be in display order.
 */
export async function moveInList(
  siblings: { id: number }[],
  id: number,
  dir: "up" | "down",
  save: (id: number, sortOrder: number) => Promise<unknown>,
) {
  const ids = siblings.map((s) => s.id);
  const i = ids.indexOf(id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((rowId, n) => save(rowId, n)));
}
