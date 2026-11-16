// Saving opening hours for an outlet or a facility. Callers check access first.
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { openingHours } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import type { CurrentUser } from "@/lib/auth/current";
import { moveInList } from "./access";
import { back, int, isTime, str } from "./form";

const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6];

export async function saveHoursFor(form: FormData, owner: { outletId: number } | { facilityId: number }, path: string, user: CurrentUser) {
  const db = getDb();
  const ownerWhere = "outletId" in owner ? eq(openingHours.outletId, owner.outletId) : eq(openingHours.facilityId, owner.facilityId);
  const id = int(form, "id");
  const intent = str(form, "intent");
  const siblings = await db
    .select({ id: openingHours.id })
    .from(openingHours)
    .where(ownerWhere)
    .orderBy(asc(openingHours.sortOrder), asc(openingHours.id));
  const owns = id !== null && siblings.some((s) => s.id === id);

  if (intent === "delete" && owns) {
    await db.delete(openingHours).where(eq(openingHours.id, id!));
    back(path, "Hours removed.");
  }
  if ((intent === "up" || intent === "down") && owns) {
    await moveInList(siblings, id!, intent, (rowId, n) => db.update(openingHours).set({ sortOrder: n }).where(eq(openingHours.id, rowId)));
    back(path, "Order updated.");
  }

  const label = str(form, "label");
  const opens = str(form, "opens");
  const closes = str(form, "closes");
  if (!label) back(path, "Give the hours a name, e.g. Breakfast.", "error");
  if (!isTime(opens) || !isTime(closes)) back(path, "Use times like 05:00 and 22:00. For midnight, use 24:00 or 00:00.", "error");
  const days = DAY_VALUES.filter((d) => form.getAll("days").includes(String(d)));
  const values = { label, opens, closes, days: days.length === 7 ? [] : days };

  if (owns) await db.update(openingHours).set(values).where(eq(openingHours.id, id!));
  else await db.insert(openingHours).values({ ...values, ...owner, sortOrder: siblings.length });
  await audit(user, "hours_saved", `${label} ${opens}-${closes}`);
  back(path, `Saved ${label} hours.`);
}
