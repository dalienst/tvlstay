import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { properties } from "@/lib/db/schema";
import { SPOT_COOKIE, SPOT_HOURS, spotByCode } from "@/lib/spot";

// Location QR codes (e.g. on the sun loungers at the main pool) point here (/s/<code>).
// We remember the spot for a few hours, so a request made from there says where to bring it,
// then open that facility's page.
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const found = await spotByCode(code);
  const [property] = found ? await getDb().select().from(properties).where(eq(properties.id, found.facility.propertyId)) : [];
  if (!found || !property?.isPublished) return NextResponse.redirect(new URL("/", req.url));
  const target = found.facility.isPublished ? `/${property.slug}/facilities/${found.facility.slug}` : `/${property.slug}`;
  const res = NextResponse.redirect(new URL(target, req.url));
  res.cookies.set(SPOT_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SPOT_HOURS * 3600,
  });
  return res;
}
