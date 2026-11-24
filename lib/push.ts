import webpush from "web-push";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { pushSubscriptions, users } from "@/lib/db/schema";
import { canHandleRequests, isRole } from "@/lib/auth/roles";

// Push alerts to staff phones and computers ("Get alerts on this phone" in Your account).
// Needs VAPID keys: run `npx web-push generate-vapid-keys` once and set VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY and VAPID_SUBJECT (mailto:you@tamarind.co.ke). Without them, nothing is sent.

export const pushConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? null;

let ready = false;
function setup() {
  if (ready || !pushConfigured()) return ready;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@tamarind.co.ke", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
  return ready;
}

export type PushMessage = { title: string; body: string; url: string; tag?: string };

type Sub = typeof pushSubscriptions.$inferSelect;

async function deliver(subs: Sub[], msg: PushMessage) {
  if (!subs.length || !setup()) return { sent: 0 };
  const db = getDb();
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), {
          TTL: 60 * 60, // an alert older than an hour isn't useful
          urgency: "high",
          timeout: 10_000,
        });
        sent++;
        await db.update(pushSubscriptions).set({ lastSentAt: new Date() }).where(eq(pushSubscriptions.id, s.id));
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410: the phone unsubscribed or the app was removed. Forget it.
        if (status === 404 || status === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
        else console.error("[push] failed:", status, (err as Error).message);
      }
    }),
  );
  return { sent };
}

/** Everyone who handles this property's requests and asked for alerts on all of them. */
export async function pushToRequestHandlers(propertyId: number, msg: PushMessage) {
  if (!pushConfigured()) return { sent: 0 };
  const rows = await getDb()
    .select({ sub: pushSubscriptions, role: users.role, propertyId: users.propertyId, outletId: users.outletId })
    .from(pushSubscriptions)
    .innerJoin(users, eq(users.id, pushSubscriptions.userId))
    .where(and(eq(users.active, true), eq(pushSubscriptions.scope, "all")));
  const subs = rows
    .filter((r) => isRole(r.role) && canHandleRequests({ role: r.role, propertyId: r.propertyId, outletId: r.outletId }, propertyId))
    .map((r) => r.sub);
  return deliver(subs, msg);
}

/** Every device of these people (e.g. whoever a request was just assigned to). */
export async function pushToUsers(userIds: string[], msg: PushMessage) {
  if (!pushConfigured() || !userIds.length) return { sent: 0 };
  const subs = await getDb()
    .select({ sub: pushSubscriptions })
    .from(pushSubscriptions)
    .innerJoin(users, eq(users.id, pushSubscriptions.userId))
    .where(and(eq(users.active, true), inArray(pushSubscriptions.userId, userIds)));
  return deliver(subs.map((s) => s.sub), msg);
}
