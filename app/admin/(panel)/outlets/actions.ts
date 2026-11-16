"use server";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { menuShares, menus, outlets } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { canEditProperty } from "@/lib/auth/roles";
import { outletFor } from "@/lib/admin/access";
import { back, bool, imageUrl, int, opt, slugify, str } from "@/lib/admin/form";
import { saveHoursFor } from "@/lib/admin/hours";

export async function updateOutlet(form: FormData) {
  const id = int(form, "id")!;
  const { user, outlet } = await outletFor(id);
  const path = `/admin/outlets/${id}`;
  const name = str(form, "name");
  if (!name) back(path, "The name can't be empty.", "error");
  await getDb()
    .update(outlets)
    .set({
      name,
      kind: str(form, "kind") || outlet.kind,
      description: opt(form, "description"),
      imageUrl: imageUrl(form, "imageUrl"),
      logoUrl: imageUrl(form, "logoUrl"),
      phone: opt(form, "phone"),
      extension: opt(form, "extension"),
      location: opt(form, "location"),
      isPublished: bool(form, "isPublished"),
      updatedAt: new Date(),
    })
    .where(eq(outlets.id, id));
  await audit(user, "outlet_updated", name);
  back(path, "Saved.");
}

export async function deleteOutlet(form: FormData) {
  const id = int(form, "id")!;
  const { user, outlet } = await outletFor(id);
  // Outlet managers can't delete their own outlet; property admins and super admins can.
  if (!canEditProperty(user, outlet.propertyId)) back(`/admin/outlets/${id}`, "Only a property admin can delete an outlet.", "error");
  if (str(form, "confirmName") !== outlet.name)
    back(`/admin/outlets/${id}`, `Type the name exactly ("${outlet.name}") to delete it.`, "error");
  await getDb().delete(outlets).where(eq(outlets.id, id));
  await audit(user, "outlet_deleted", outlet.name);
  back(`/admin/properties/${outlet.propertyId}/outlets`, `${outlet.name} and its menus were deleted.`);
}

export async function saveHours(form: FormData) {
  const outletId = int(form, "outletId")!;
  const { user } = await outletFor(outletId);
  await saveHoursFor(form, { outletId }, `/admin/outlets/${outletId}#hours`, user);
}

export async function createMenu(form: FormData) {
  const outletId = int(form, "outletId")!;
  const { user } = await outletFor(outletId);
  const name = str(form, "name");
  const slug = slugify(name);
  const path = `/admin/outlets/${outletId}#menus`;
  if (!name || !slug) back(path, "Enter a menu name.", "error");
  const db = getDb();
  const [taken] = await db.select({ id: menus.id }).from(menus).where(and(eq(menus.outletId, outletId), eq(menus.slug, slug)));
  if (taken) back(path, `There's already a menu called "${name}".`, "error");
  const count = (await db.select({ id: menus.id }).from(menus).where(eq(menus.outletId, outletId))).length;
  const [m] = await db
    .insert(menus)
    .values({ outletId, name, slug, isSpecial: bool(form, "isSpecial"), sortOrder: count, isPublished: false })
    .returning();
  await audit(user, "menu_created", name);
  back(`/admin/menus/${m.id}`, `${name} created. Add sections and items, then tick "Show to guests".`);
}

/** Reorders menus as guests see them at this outlet: its own menus and those shared with it. */
export async function moveMenu(form: FormData) {
  const outletId = int(form, "outletId")!;
  await outletFor(outletId);
  const db = getDb();
  const own = await db.select({ id: menus.id, sortOrder: menus.sortOrder }).from(menus).where(eq(menus.outletId, outletId));
  const shared = await db
    .select({ id: menuShares.id, menuId: menuShares.menuId, sortOrder: menuShares.sortOrder })
    .from(menuShares)
    .where(eq(menuShares.outletId, outletId));
  const all = [
    ...own.map((m) => ({ key: `m${m.id}`, sortOrder: m.sortOrder })),
    ...shared.map((s) => ({ key: `s${s.id}`, sortOrder: s.sortOrder })),
  ].sort((a, b) => a.sortOrder - b.sortOrder);
  const keys = all.map((a) => a.key);
  const key = str(form, "key");
  const i = keys.indexOf(key);
  const j = str(form, "intent") === "up" ? i - 1 : i + 1;
  if (i >= 0 && j >= 0 && j < keys.length) {
    [keys[i], keys[j]] = [keys[j], keys[i]];
    await Promise.all(
      keys.map((k, n) =>
        k.startsWith("m")
          ? db.update(menus).set({ sortOrder: n }).where(eq(menus.id, Number(k.slice(1))))
          : db.update(menuShares).set({ sortOrder: n }).where(eq(menuShares.id, Number(k.slice(1)))),
      ),
    );
  }
  back(`/admin/outlets/${outletId}#menus`, "Order updated.");
}
