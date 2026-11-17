import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirects to a path on this site, using the public address. Building it from req.url breaks
 * behind Railway's proxy, where the app sees itself as http://localhost:8080 (and Next turns a
 * relative Location into that address too). So: APP_URL if set, else the forwarded host.
 */
export function siteOrigin(req: NextRequest) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] ?? new URL(req.url).protocol.replace(":", "");
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

export function localRedirect(path: string, req: NextRequest) {
  return NextResponse.redirect(`${siteOrigin(req)}${path}`, 307);
}
