"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { after } from "next/server";
import { getDb } from "@/lib/db/db";
import { REQUEST_STATUSES, guestRequests, users, type RequestStatus } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/current";
import { canHandleRequests, isRole } from "@/lib/auth/roles";
import { back, int, opt, str } from "@/lib/admin/form";
import { notifyAssigned } from "@/lib/notify";

export async function updateRequest(form: FormData) {
  const user = await requireUser({ roles: ["super_admin", "property_admin", "requests_team"] });
  const id = int(form, "id")!;
  const ret = str(form, "return") || "/admin/requests";
  const path = ret.startsWith("/admin/requests") ? ret : "/admin/requests";
  const db = getDb();
  const [r] = await db.select().from(guestRequests).where(eq(guestRequests.id, id)).limit(1);
  if (!r || !canHandleRequests(user, r.propertyId)) back(path, "That request wasn't found.", "error");
  const status = str(form, "status") as RequestStatus;
  if (!REQUEST_STATUSES.includes(status)) back(path, "Pick a status.", "error");

  // Assignment: only to an active staff member who can handle this property's requests.
  const assignee = str(form, "assignedTo") || null;
  if (assignee) {
    const [u] = await db.select().from(users).where(eq(users.id, assignee)).limit(1);
    if (!u || !u.active || !isRole(u.role) || !canHandleRequests({ role: u.role, propertyId: u.propertyId, outletId: u.outletId }, r.propertyId))
      back(path, "That person can't take guest requests for this property.", "error");
  }

  await db
    .update(guestRequests)
    .set({ status, staffNote: opt(form, "staffNote"), assignedTo: assignee, handledBy: user.name, updatedAt: new Date() })
    .where(eq(guestRequests.id, id));
  await audit(user, "request_updated", `#${id} ${r.title}: ${status}${assignee !== r.assignedTo ? `, assigned` : ""}`);

  if (assignee && assignee !== r.assignedTo && assignee !== user.id) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const origin = host ? `${h.get("x-forwarded-proto") ?? "http"}://${host}` : undefined;
    after(() => notifyAssigned(id, assignee, user.name, origin).catch((err) => console.error("[notify] assign", id, err)));
  }
  back(`${path}#r${id}`, `Request #${id} updated.`);
}
