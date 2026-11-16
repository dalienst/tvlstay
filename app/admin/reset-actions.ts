"use server";

import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/lib/db/db";
import { passwordResets, users } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { emailConfigured } from "@/lib/email";
import { findReset, sendResetLink } from "@/lib/auth/reset";

type State = { ok?: boolean; error?: string } | undefined;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "http"}://${host}` : undefined;
}

/** Always answers the same way, so the form doesn't reveal which emails have accounts. */
export async function requestReset(_prev: State, form: FormData): Promise<State> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter your work email." };
  if (!emailConfigured()) return { error: "Password emails aren't set up yet. Ask a super admin to reset your password." };
  const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  if (user?.active) {
    const res = await sendResetLink(user, await origin());
    await audit({ id: user.id, email }, res.ok ? "password_reset_requested" : "password_reset_failed", res.ok ? undefined : res.error);
  } else {
    await audit({ id: "", email }, "password_reset_unknown_email");
  }
  return { ok: true };
}

export async function resetPassword(_prev: State, form: FormData): Promise<State> {
  const token = String(form.get("token") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const found = await findReset(token);
  if (!found) return { error: "This link has expired or was already used. Ask for a new one." };
  if (next.length < 10) return { error: "Choose a password of at least 10 characters." };
  if (next !== confirm) return { error: "The passwords don't match." };
  const db = getDb();
  const now = new Date();
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(next, 12), mustChangePassword: false, passwordChangedAt: now })
    .where(eq(users.id, found.user.id));
  // This link and any other unused ones for this person stop working.
  await db.update(passwordResets).set({ usedAt: now }).where(and(eq(passwordResets.userId, found.user.id), isNull(passwordResets.usedAt)));
  await audit(found.user, "password_reset");
  return { ok: true };
}
