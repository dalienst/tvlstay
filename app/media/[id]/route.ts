import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { media } from "@/lib/db/schema";

// Public: uploaded photos appear on guest pages. A photo's bytes never change for a
// given id (replacing a photo uploads a new one), so browsers and CDNs can cache it for good.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number.parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return new Response("Not found", { status: 404 });
  const [row] = await getDb()
    .select({ data: media.data, contentType: media.contentType })
    .from(media)
    .where(eq(media.id, id))
    .limit(1);
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
