"use server";

import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { menuItems, menuSections, menuShares, menus, outlets } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { canEditProperty } from "@/lib/auth/roles";
import { itemFor, menuFor, moveInList, sectionFor } from "@/lib/admin/access";
import { back, bool, imageUrl, int, opt, slugify, str } from "@/lib/admin/form";
import { parsePrice } from "@/lib/menu-text";

const TAGS = ["vegetarian", "vegan", "spicy", "seafood", "gluten-free", "sugar-free", "alcohol-free", "signature", "new"];

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function updateMenu(form: FormData) {
  const id = int(form, "id")!;
  const { user, menu, outlet } = await menuFor(id);
  const path = `/admin/menus/${id}`;
  const name = str(form, "name");
  if (!name) back(path, "The menu name can't be empty.", "error");
  const startsOn = str(form, "startsOn");
  const endsOn = str(form, "endsOn");
  if ((startsOn && !isDate(startsOn)) || (endsOn && !isDate(endsOn))) back(path, "Pick valid dates.", "error");
  if (startsOn && endsOn && endsOn < startsOn) back(path, "The end date is before the start date.", "error");

  const db = getDb();
  let slug = slugify(name) || menu.slug;
  const [clash] = await db
    .select({ id: menus.id })
    .from(menus)
    .where(and(eq(menus.outletId, outlet.id), eq(menus.slug, slug), ne(menus.id, id)));
  if (clash) slug = `${slug}-${id}`;

  await db
    .update(menus)
    .set({
      name,
      slug,
      description: opt(form, "description"),
      servedNote: opt(form, "servedNote"),
      footnote: opt(form, "footnote"),
      isSpecial: bool(form, "isSpecial"),
      startsOn: startsOn || null,
      endsOn: endsOn || null,
      isPublished: bool(form, "isPublished"),
      updatedAt: new Date(),
    })
    .where(eq(menus.id, id));

  // Sharing: only admins of the owning property choose where else the menu shows.
  if (canEditProperty(user, outlet.propertyId) && form.get("sharesShown") === "1") {
    const wanted = new Set(form.getAll("shareWith").map((v) => Number(v)).filter((n) => Number.isFinite(n) && n !== outlet.id));
    const allowed = new Set(
      (user.role === "super_admin"
        ? await db.select({ id: outlets.id }).from(outlets)
        : await db.select({ id: outlets.id }).from(outlets).where(eq(outlets.propertyId, outlet.propertyId))
      ).map((o) => o.id),
    );
    const current = await db.select().from(menuShares).where(eq(menuShares.menuId, id));
    for (const s of current) {
      if (allowed.has(s.outletId) && !wanted.has(s.outletId)) await db.delete(menuShares).where(eq(menuShares.id, s.id));
    }
    for (const outletId of wanted) {
      if (allowed.has(outletId) && !current.some((s) => s.outletId === outletId))
        await db.insert(menuShares).values({ menuId: id, outletId, sortOrder: 100 });
    }
  }
  await audit(user, "menu_updated", name);
  back(path, "Saved.");
}

export async function deleteMenu(form: FormData) {
  const id = int(form, "id")!;
  const { user, menu, outlet } = await menuFor(id);
  if (str(form, "confirmName") !== menu.name) back(`/admin/menus/${id}`, `Type the menu name exactly ("${menu.name}") to delete it.`, "error");
  await getDb().delete(menus).where(eq(menus.id, id));
  await audit(user, "menu_deleted", menu.name);
  back(`/admin/outlets/${outlet.id}#menus`, `${menu.name} deleted.`);
}

// ---------- Sections ----------

export async function saveSection(form: FormData) {
  const intent = str(form, "intent");
  const db = getDb();
  const sectionId = int(form, "id");

  if (!sectionId) {
    const menuId = int(form, "menuId")!;
    const { user } = await menuFor(menuId);
    const name = str(form, "name");
    if (!name) back(`/admin/menus/${menuId}`, "Enter a section name.", "error");
    const count = (await db.select({ id: menuSections.id }).from(menuSections).where(eq(menuSections.menuId, menuId))).length;
    const [s] = await db
      .insert(menuSections)
      .values({ menuId, name, description: opt(form, "description"), sortOrder: count })
      .returning();
    await audit(user, "section_added", name);
    back(`/admin/menus/${menuId}#s-${s.id}`, `Added section "${name}".`);
  }

  const { user, menu, section } = await sectionFor(sectionId);
  const path = `/admin/menus/${menu.id}#s-${section.id}`;
  if (intent === "delete") {
    await db.delete(menuSections).where(eq(menuSections.id, section.id));
    await audit(user, "section_deleted", section.name);
    back(`/admin/menus/${menu.id}`, `Deleted section "${section.name}" and its items.`);
  }
  if (intent === "up" || intent === "down") {
    const siblings = await db
      .select({ id: menuSections.id })
      .from(menuSections)
      .where(eq(menuSections.menuId, menu.id))
      .orderBy(asc(menuSections.sortOrder), asc(menuSections.id));
    await moveInList(siblings, section.id, intent, (rowId, n) => db.update(menuSections).set({ sortOrder: n }).where(eq(menuSections.id, rowId)));
    back(path, "Order updated.");
  }
  const name = str(form, "name");
  if (!name) back(path, "The section name can't be empty.", "error");
  await db
    .update(menuSections)
    .set({ name, description: opt(form, "description"), isPublished: bool(form, "isPublished"), updatedAt: new Date() })
    .where(eq(menuSections.id, section.id));
  await audit(user, "section_updated", name);
  back(path, `Saved section "${name}".`);
}

// ---------- Items ----------

function itemValues(form: FormData, path: string) {
  const name = str(form, "name");
  if (!name) back(path, "The item needs a name.", "error");
  let prices;
  try {
    prices = parsePrice(str(form, "prices"));
  } catch (err) {
    back(path, (err as Error).message, "error");
  }
  return {
    name,
    description: opt(form, "description"),
    prices,
    priceNote: opt(form, "priceNote"),
    tags: form
      .getAll("tags")
      .map(String)
      .filter((t) => TAGS.includes(t)),
    imageUrl: imageUrl(form, "imageUrl"),
  };
}

export async function addItem(form: FormData) {
  const sectionId = int(form, "sectionId")!;
  const { user, menu } = await sectionFor(sectionId);
  const path = `/admin/menus/${menu.id}#s-${sectionId}`;
  const values = itemValues(form, path);
  const db = getDb();
  const count = (await db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.sectionId, sectionId))).length;
  await db.insert(menuItems).values({ ...values, sectionId, sortOrder: count });
  await audit(user, "item_added", `${values.name} (${menu.name})`);
  back(path, `Added "${values.name}".`);
}

export async function saveItem(form: FormData) {
  const id = int(form, "id")!;
  const { user, menu, item } = await itemFor(id);
  const path = `/admin/menus/${menu.id}#i-${id}`;
  const db = getDb();
  const intent = str(form, "intent");

  if (intent === "availability") {
    await db.update(menuItems).set({ isAvailable: !item.isAvailable, updatedAt: new Date() }).where(eq(menuItems.id, id));
    await audit(user, item.isAvailable ? "item_sold_out" : "item_available", item.name);
    back(path, item.isAvailable ? `"${item.name}" marked as not available today.` : `"${item.name}" is available again.`);
  }
  if (intent === "delete") {
    await db.delete(menuItems).where(eq(menuItems.id, id));
    await audit(user, "item_deleted", item.name);
    back(`/admin/menus/${menu.id}#s-${item.sectionId}`, `Deleted "${item.name}".`);
  }
  if (intent === "up" || intent === "down") {
    const siblings = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(eq(menuItems.sectionId, item.sectionId))
      .orderBy(asc(menuItems.sortOrder), asc(menuItems.id));
    await moveInList(siblings, id, intent, (rowId, n) => db.update(menuItems).set({ sortOrder: n }).where(eq(menuItems.id, rowId)));
    back(path, "Order updated.");
  }

  const values = itemValues(form, path);
  // Moving to another section of the same menu.
  let sectionId = item.sectionId;
  const target = int(form, "sectionId");
  if (target && target !== item.sectionId) {
    const [s] = await db.select().from(menuSections).where(and(eq(menuSections.id, target), eq(menuSections.menuId, menu.id)));
    if (s) sectionId = s.id;
  }
  await db
    .update(menuItems)
    .set({
      ...values,
      sectionId,
      sortOrder: sectionId === item.sectionId ? item.sortOrder : 9999,
      isAvailable: bool(form, "isAvailable"),
      isPublished: bool(form, "isPublished"),
      updatedAt: new Date(),
    })
    .where(eq(menuItems.id, id));
  await audit(user, "item_updated", values.name);
  back(path, `Saved "${values.name}".`);
}
