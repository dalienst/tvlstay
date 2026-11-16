import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { outlets } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/auth/current";

/**
 * What a user can reach. Outlet managers belong to their outlet's property for
 * photo uploads, so their photos show in that property's library.
 */
export async function scopeFor(user: CurrentUser): Promise<{ all: boolean; propertyId: number | null; outletId: number | null }> {
  if (user.role === "super_admin") return { all: true, propertyId: null, outletId: null };
  if (user.role === "property_admin") return { all: false, propertyId: user.propertyId, outletId: null };
  if (user.role === "requests_team" || !user.outletId) return { all: false, propertyId: null, outletId: null };
  const [o] = await getDb().select({ propertyId: outlets.propertyId }).from(outlets).where(eq(outlets.id, user.outletId));
  return { all: false, propertyId: o?.propertyId ?? null, outletId: user.outletId };
}
