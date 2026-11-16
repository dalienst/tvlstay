import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb } from "./db/db";
import { facilities, spots } from "./db/schema";

export const SPOT_COOKIE = "tvl_spot";
/** A spot is remembered for a few hours: long enough for an afternoon at the pool. */
export const SPOT_HOURS = 6;

export async function spotByCode(code: string) {
  const [row] = await getDb()
    .select({ spot: spots, facility: facilities })
    .from(spots)
    .innerJoin(facilities, eq(facilities.id, spots.facilityId))
    .where(and(eq(spots.code, code), eq(spots.isActive, true)));
  return row ?? null;
}

/** The spot the guest last scanned (e.g. Main pool), if it belongs to this property. */
export async function currentSpot(propertyId: number) {
  const code = (await cookies()).get(SPOT_COOKIE)?.value;
  if (!code) return null;
  const found = await spotByCode(code);
  return found && found.facility.propertyId === propertyId ? found : null;
}
