import { SignJWT, jwtVerify } from "jose";

// Same approach as the website and the accounting app: a signed cookie, re-checked
// against the database on every admin request (lib/auth/current.ts).
export const COOKIE_NAME = "tvlstay_session";
export const SESSION_HOURS = 12;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters.");
  }
  return new TextEncoder().encode(s);
}

export async function createSessionToken(userId: string): Promise<string> {
  return await new SignJWT({ id: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

/** The user id and when the session started (seconds), if the token is valid. */
export async function readSessionToken(token: string | undefined): Promise<{ id: string; iat: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.id === "string" ? { id: payload.id, iat: payload.iat ?? 0 } : null;
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  return (await readSessionToken(token))?.id ?? null;
}

/** Sessions started before the password last changed are no longer valid. */
export function startedAfter(iat: number, passwordChangedAt: Date | null) {
  return !passwordChangedAt || (iat + 1) * 1000 > passwordChangedAt.getTime();
}

export const sessionCookie = (token: string) =>
  [
    COOKIE_NAME,
    token,
    { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: SESSION_HOURS * 3600 },
  ] as const;
