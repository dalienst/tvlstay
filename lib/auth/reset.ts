// "Forgot password" links: a random token emailed to the staff member. Only its hash is
// stored, it works once, and it expires after an hour.
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { passwordResets, users } from "@/lib/db/schema";
import { appUrl, sendStaffEmail } from "@/lib/email";

export const RESET_MINUTES = 60;
const MAX_PER_HOUR = 3;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Emails a reset link. Returns false (and sends nothing) when there have been too many recently. */
export async function sendResetLink(user: { id: string; name: string; email: string }, origin?: string, invitedBy?: string) {
  const db = getDb();
  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(passwordResets)
    .where(and(eq(passwordResets.userId, user.id), gt(passwordResets.createdAt, new Date(Date.now() - 3600_000))));
  if (recent >= MAX_PER_HOUR) return { ok: false as const, error: "Too many reset links in the last hour. Try again later." };
  const base = appUrl(origin);
  if (!base) return { ok: false as const, error: "APP_URL isn't set, so the link can't be built." };

  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResets).values({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) });
  const res = await sendStaffEmail({
    to: [user.email],
    subject: "Reset your guest guide password",
    heading: `Hi ${user.name.split(" ")[0]}, choose a new password`,
    lines: [
      invitedBy
        ? `${invitedBy} sent you a link to set a new password for the Tamarind guest guide admin.`
        : "Someone (hopefully you) asked to reset your password for the Tamarind guest guide admin.",
      `The link works once and expires in ${RESET_MINUTES} minutes. If you didn't ask for this, you can ignore this email: your password stays the same.`,
    ],
    button: { label: "Choose a new password", url: `${base}/admin/reset?token=${token}` },
  });
  return res.ok ? { ok: true as const } : { ok: false as const, error: res.error };
}

/** The user a reset token belongs to, if it's valid, unused and not expired. */
export async function findReset(token: string) {
  if (!token || token.length < 20) return null;
  const [row] = await getDb()
    .select({ reset: passwordResets, user: users })
    .from(passwordResets)
    .innerJoin(users, eq(users.id, passwordResets.userId))
    .where(and(eq(passwordResets.tokenHash, hashToken(token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())));
  if (!row || !row.user.active) return null;
  return row;
}
