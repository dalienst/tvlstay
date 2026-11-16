import { NextResponse, type NextRequest } from "next/server";
import { getRoomByCode } from "@/lib/compendium";
import { ROOM_COOKIE } from "@/lib/room";

// Per-room QR codes point here (/r/<code>). We remember the room in a cookie so that
// later features (room service, requests) know where the guest is, then open the guide.
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const found = await getRoomByCode(code);
  if (!found || !found.property.isPublished) return NextResponse.redirect(new URL("/", req.url));

  const res = NextResponse.redirect(new URL(`/${found.property.slug}`, req.url));
  res.cookies.set(ROOM_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
