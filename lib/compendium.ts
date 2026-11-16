// Read-only queries for the guest pages. Everything guests see goes through here,
// so unpublished properties, outlets, menus, sections and items never leak out.
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "./db/db";
import {
  amenities,
  facilities,
  facilityServices,
  guestRequests,
  infoItems,
  menuItems,
  menuSections,
  menuShares,
  menus,
  openingHours,
  outlets,
  properties,
  rooms,
} from "./db/schema";
import { todayInNairobi } from "./time";

export type Property = typeof properties.$inferSelect;
export type Outlet = typeof outlets.$inferSelect;
export type Hours = typeof openingHours.$inferSelect;
export type Menu = typeof menus.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Section = typeof menuSections.$inferSelect & { items: MenuItem[] };

export async function listProperties() {
  return getDb()
    .select()
    .from(properties)
    .where(eq(properties.isPublished, true))
    .orderBy(asc(properties.sortOrder), asc(properties.name));
}

export async function getProperty(slug: string) {
  const [row] = await getDb()
    .select()
    .from(properties)
    .where(and(eq(properties.slug, slug), eq(properties.isPublished, true)));
  return row ?? null;
}

export async function getAmenities(propertyId: number) {
  return getDb()
    .select()
    .from(amenities)
    .where(and(eq(amenities.propertyId, propertyId), eq(amenities.isPublished, true)))
    .orderBy(asc(amenities.sortOrder), asc(amenities.id));
}

export async function getInfo(propertyId: number) {
  return getDb()
    .select()
    .from(infoItems)
    .where(and(eq(infoItems.propertyId, propertyId), eq(infoItems.isPublished, true)))
    .orderBy(asc(infoItems.sortOrder), asc(infoItems.id));
}

/** Outlets (restaurants, bars...) with their opening hours. */
export async function getOutlets(propertyId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(outlets)
    .where(and(eq(outlets.propertyId, propertyId), eq(outlets.isPublished, true)))
    .orderBy(asc(outlets.sortOrder), asc(outlets.name));
  if (!rows.length) return [];
  const hours = await db
    .select()
    .from(openingHours)
    .where(inArray(openingHours.outletId, rows.map((o) => o.id)))
    .orderBy(asc(openingHours.sortOrder), asc(openingHours.opens));
  return rows.map((o) => ({ ...o, hours: hours.filter((h) => h.outletId === o.id) }));
}

export async function getOutlet(propertyId: number, slug: string) {
  const all = await getOutlets(propertyId);
  return all.find((o) => o.slug === slug) ?? null;
}

function isCurrent(menu: Menu, today: string) {
  if (menu.startsOn && today < menu.startsOn) return false;
  if (menu.endsOn && today > menu.endsOn) return false;
  return true;
}

/** Menus the outlet owns plus menus shared with it, in display order. Specials outside their dates are left out. */
export async function getOutletMenus(outletId: number) {
  const db = getDb();
  const own = await db
    .select()
    .from(menus)
    .where(and(eq(menus.outletId, outletId), eq(menus.isPublished, true)));
  const shared = await db
    .select({ menu: menus, sortOrder: menuShares.sortOrder })
    .from(menuShares)
    .innerJoin(menus, eq(menus.id, menuShares.menuId))
    .where(and(eq(menuShares.outletId, outletId), eq(menus.isPublished, true)));
  const today = todayInNairobi();
  return [...own, ...shared.map((s) => ({ ...s.menu, sortOrder: s.sortOrder }))]
    .filter((m) => isCurrent(m, today))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/** Published sections and items of one menu. */
export async function getMenuSections(menuId: number): Promise<Section[]> {
  const db = getDb();
  const sections = await db
    .select()
    .from(menuSections)
    .where(and(eq(menuSections.menuId, menuId), eq(menuSections.isPublished, true)))
    .orderBy(asc(menuSections.sortOrder), asc(menuSections.id));
  if (!sections.length) return [];
  const items = await db
    .select()
    .from(menuItems)
    .where(and(inArray(menuItems.sectionId, sections.map((s) => s.id)), eq(menuItems.isPublished, true)))
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.id));
  return sections
    .map((s) => ({ ...s, items: items.filter((i) => i.sectionId === s.id) }))
    .filter((s) => s.items.length > 0);
}

export async function getRoomByCode(code: string) {
  const [row] = await getDb()
    .select({ room: rooms, property: properties })
    .from(rooms)
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(and(eq(rooms.code, code), eq(rooms.isActive, true)));
  return row ?? null;
}

export type Facility = typeof facilities.$inferSelect;
export type FacilityService = typeof facilityServices.$inferSelect;

/** Published facilities (pools, housekeeping...) with their hours and published services. */
export async function getFacilities(propertyId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(facilities)
    .where(and(eq(facilities.propertyId, propertyId), eq(facilities.isPublished, true)))
    .orderBy(asc(facilities.sortOrder), asc(facilities.name));
  if (!rows.length) return [];
  const ids = rows.map((f) => f.id);
  const [hours, services] = await Promise.all([
    db.select().from(openingHours).where(inArray(openingHours.facilityId, ids)).orderBy(asc(openingHours.sortOrder), asc(openingHours.opens)),
    db
      .select()
      .from(facilityServices)
      .where(and(inArray(facilityServices.facilityId, ids), eq(facilityServices.isPublished, true)))
      .orderBy(asc(facilityServices.sortOrder), asc(facilityServices.id)),
  ]);
  return rows.map((f) => ({
    ...f,
    hours: hours.filter((h) => h.facilityId === f.id),
    services: services.filter((s) => s.facilityId === f.id),
  }));
}

export async function getFacility(propertyId: number, slug: string) {
  const all = await getFacilities(propertyId);
  return all.find((f) => f.slug === slug) ?? null;
}

/** A guest's own recent requests (ids kept in their browser), newest first. */
export async function getGuestRequests(propertyId: number, ids: number[]) {
  if (!ids.length) return [];
  return getDb()
    .select({
      id: guestRequests.id,
      title: guestRequests.title,
      status: guestRequests.status,
      createdAt: guestRequests.createdAt,
      updatedAt: guestRequests.updatedAt,
    })
    .from(guestRequests)
    .where(and(eq(guestRequests.propertyId, propertyId), inArray(guestRequests.id, ids)))
    .orderBy(desc(guestRequests.createdAt));
}

/** Restaurants at the group's other live properties, for "Also from Tamarind". */
export async function getSisterOutlets(propertyId: number) {
  const db = getDb();
  const others = await db
    .select()
    .from(properties)
    .where(and(eq(properties.isPublished, true), eq(properties.showInOtherGuides, true), ne(properties.id, propertyId)))
    .orderBy(asc(properties.sortOrder), asc(properties.name));
  const rows = await Promise.all(others.map(async (p) => (await getOutlets(p.id)).map((o) => ({ ...o, property: p }))));
  return rows.flat();
}
