import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { guestRequests } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/current";
import { canSeeRequests, newRequestCount, requestScope } from "@/lib/admin/requests";

// Polled every few seconds by the admin (components/admin/RequestAlerts) to show new requests
// as they arrive: the number waiting and the newest one, for the chime and the pop-up.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canSeeRequests(user)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const [count, [latest]] = await Promise.all([
    newRequestCount(user),
    getDb()
      .select({ id: guestRequests.id, title: guestRequests.title, kind: guestRequests.kind, room: guestRequests.roomLabel, deliverTo: guestRequests.deliverTo })
      .from(guestRequests)
      .where(and(eq(guestRequests.status, "new"), requestScope(user)))
      .orderBy(desc(guestRequests.id))
      .limit(1),
  ]);
  return NextResponse.json({ count, latest: latest ?? null }, { headers: { "Cache-Control": "no-store" } });
}
