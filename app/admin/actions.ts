"use server";

import bcrypt from "bcryptjs";
import { and, eq, gte, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/db";
import { auditLogs, users } from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { COOKIE_NAME, createSessionToken, sessionCookie } from "@/lib/auth/session";
import { isRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/current";
import { back, str } from "@/lib/admin/form";

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export async function login(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const email = str(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const db = getDb();
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
  const [{ failures }] = await db
    .select({ failures: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(and(eq(auditLogs.action, "login_failed"), eq(auditLogs.userEmail, email), gte(auditLogs.at, since)));
  if (failures >= MAX_FAILURES) return { error: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.` };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok || !user.active || !isRole(user.role)) {
    await audit({ id: user?.id ?? "", email }, "login_failed");
    return { error: user && ok && !user.active ? "This account has been deactivated." : "Wrong email or password." };
  }

  await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));
  await audit(user, "login");
  (await cookies()).set(...sessionCookie(await createSessionToken(user.id)));
  redirect(user.mustChangePassword ? "/admin/account" : "/admin");
}

export async function logout() {
  (await cookies()).delete(COOKIE_NAME);
  redirect("/admin/login");
}

export async function changePassword(form: FormData) {
  const user = await requireUser({ allowTemporaryPassword: true });
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || !(await bcrypt.compare(current, row.passwordHash))) back("/admin/account", "Your current password is wrong.", "error");
  if (next.length < 10) back("/admin/account", "Choose a password of at least 10 characters.", "error");
  if (next !== confirm) back("/admin/account", "The new passwords don't match.", "error");
  if (next === current) back("/admin/account", "Choose a password different from the temporary one.", "error");
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(next, 12), mustChangePassword: false, passwordChangedAt: new Date() })
    .where(eq(users.id, user.id));
  await audit(user, "password_changed");
  // Other devices are signed out; this one gets a fresh session.
  (await cookies()).set(...sessionCookie(await createSessionToken(user.id)));
  back("/admin", "Password changed.");
}
