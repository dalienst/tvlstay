import { and, eq, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { guestRequests } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/auth/current";

/** Who sees guest requests: super admins (all properties), property admins and the requests team (their own). */
export const canSeeRequests = (u: CurrentUser) =>
  u.role === "super_admin" || ((u.role === "property_admin" || u.role === "requests_team") && !!u.propertyId);

export function requestScope(u: CurrentUser): SQL | undefined {
  if (u.role === "super_admin") return undefined;
  return eq(guestRequests.propertyId, u.propertyId ?? -1);
}

export async function newRequestCount(u: CurrentUser) {
  if (!canSeeRequests(u)) return 0;
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(guestRequests)
    .where(and(eq(guestRequests.status, "new"), requestScope(u)));
  return row?.n ?? 0;
}

export const STATUS_LABELS = { new: "New", in_progress: "In progress", done: "Done", cancelled: "Cancelled" } as const;
