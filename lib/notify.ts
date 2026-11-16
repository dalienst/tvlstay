// Staff email alerts for guest requests. Called with after(), so a slow or failed email
// never holds up the guest. Recipients are staff addresses set in the admin panel; the
// guest's own contact details are never used as a recipient.
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { facilities, guestRequests, properties, users } from "@/lib/db/schema";
import { appUrl, emailList, sendStaffEmail } from "./email";

async function load(requestId: number) {
  const db = getDb();
  const [row] = await db
    .select({ r: guestRequests, property: properties })
    .from(guestRequests)
    .innerJoin(properties, eq(properties.id, guestRequests.propertyId))
    .where(eq(guestRequests.id, requestId));
  if (!row) return null;
  const [facility] = row.r.facilityId ? await db.select().from(facilities).where(eq(facilities.id, row.r.facilityId)) : [];
  return { ...row, facility: facility ?? null };
}

/** Who hears about a request: the facility's team, else the property's request/issue inbox. */
export function recipientsFor(
  r: { kind: string },
  property: { requestsEmail: string | null; issuesEmail: string | null },
  facility: { notifyEmails: string | null } | null,
) {
  if (r.kind === "issue") {
    const maintenance = emailList(property.issuesEmail);
    return maintenance.length ? maintenance : emailList(property.requestsEmail);
  }
  const team = emailList(facility?.notifyEmails);
  return team.length ? team : emailList(property.requestsEmail);
}

function details(r: typeof guestRequests.$inferSelect) {
  return [
    r.option ? `Option: ${r.option}` : null,
    r.deliverTo ? `Bring to: ${r.deliverTo}` : null,
    `Room: ${r.roomLabel ?? "not given"}`,
    r.guestName ? `Guest: ${r.guestName}` : null,
    r.contact ? `Phone: ${r.contact}` : null,
    r.message ? `Message: ${r.message}` : null,
  ].filter(Boolean) as string[];
}

export async function notifyNewRequest(requestId: number, origin?: string) {
  const row = await load(requestId);
  if (!row) return;
  const { r, property, facility } = row;
  const to = recipientsFor(r, property, facility);
  if (!to.length) return;
  const base = appUrl(origin);
  const label = r.kind === "issue" ? `Problem: ${r.title}` : r.title;
  await sendStaffEmail({
    to,
    subject: `${label} · ${r.deliverTo && !r.deliverTo.startsWith("Room ") ? `${r.deliverTo} · ` : ""}Room ${r.roomLabel ?? "?"} · #${r.id}`,
    heading: `New ${r.kind === "issue" ? "problem reported" : "request"} at ${property.name}`,
    lines: [label, ...details(r)],
    button: base ? { label: "Open in Requests", url: `${base}/admin/requests#r${r.id}` } : undefined,
    idempotencyKey: `request-${r.id}`,
  });
}

export async function notifyAssigned(requestId: number, userId: string, byName: string, origin?: string) {
  const row = await load(requestId);
  if (!row) return;
  const [u] = await getDb().select().from(users).where(eq(users.id, userId));
  if (!u?.active) return;
  const { r, property } = row;
  const base = appUrl(origin);
  const label = r.kind === "issue" ? `Problem: ${r.title}` : r.title;
  await sendStaffEmail({
    to: [u.email],
    subject: `Assigned to you: ${label} · Room ${r.roomLabel ?? "?"}`,
    heading: `${byName} assigned you a guest request`,
    lines: [`${property.name}: ${label}`, ...details(r)],
    button: base ? { label: "Open in Requests", url: `${base}/admin/requests#r${r.id}` } : undefined,
  });
}
