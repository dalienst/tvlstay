import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

// Guest pages are public. Everything under /admin needs a valid session; pages and
// actions then re-check the user and their role against the database.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login" || pathname === "/admin/forgot" || pathname === "/admin/reset") return NextResponse.next();
  const userId = await verifySessionToken(req.cookies.get(COOKIE_NAME)?.value);
  if (userId) return NextResponse.next();
  if (pathname.startsWith("/admin/api/")) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/admin/:path*"],
};

export default proxy;
