import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/db";

/** Where a photo is used, so we don't delete one that guests still see. */
export async function photoUsage(url: string) {
  const rows = await getDb().execute<{ place: string }>(sql`
    select 'Property: ' || name as place from properties
      where logo_url = ${url} or hero_image_url = ${url} or gallery ? ${url}
    union all
    select 'Outlet: ' || name from outlets where image_url = ${url} or logo_url = ${url}
    union all
    select 'Menu item: ' || name from menu_items where image_url = ${url}
  `);
  return rows.map((r) => r.place);
}

