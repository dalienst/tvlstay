"use server";

import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/current";
import { isRole } from "@/lib/auth/roles";
import { audit } from "@/lib/audit";
import { back, int, str } from "@/lib/admin/form";
import { headers } from "next/headers";
import { sendResetLink } from "@/lib/auth/reset";

const tempPassword = () => randomBytes(9).toString("base64url");

/** Reads role + scope. Property admins need a property; outlet managers an outlet. */
function roleAndScope(form: FormData) {
  const role = str(form, "role");
  if (!isRole(role)) back("/admin/staff", "Pick a role.", "error");
  const propertyId = role === "property_admin" || role === "requests_team" ? int(form, "propertyId") : null;
  const outletId = role === "outlet_manager" ? int(form, "outletId") : null;
  if ((role === "property_admin" || role === "requests_team") && !propertyId) back("/admin/staff", "Pick their property.", "error");
  if (role === "outlet_manager" && !outletId) back("/admin/staff", "Pick the outlet they manage.", "error");
  return { role, propertyId, outletId };
}

// Staff accounts get a temporary password shown once on screen. Later, a super admin can also
// email them a reset link (when email is set up). Guests are never emailed from here.
export async function createStaff(form: FormData) {
  const admin = await requireUser({ roles: ["super_admin"] });
  const name = str(form, "name");
  const email = str(form, "email").toLowerCase();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) back("/admin/staff", "Enter a name and a valid email.", "error");
  const scope = roleAndScope(form);
  const db = getDb();
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists) back("/admin/staff", `${email} already has an account.`, "error");
  const password = tempPassword();
  await db.insert(users).values({ id: randomUUID(), name, email, ...scope, passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true });
  await audit(admin, "staff_created", `${email} as ${scope.role}`);
  back("/admin/staff", `Created ${email}. Temporary password: ${password} (shown once, so share it privately). They'll choose their own at first sign-in.`);
}

export async function updateStaff(form: FormData) {
  const admin = await requireUser({ roles: ["super_admin"] });
  const id = str(form, "id");
  const intent = str(form, "intent");
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) back("/admin/staff", "Account not found.", "error");

  if (intent === "role") {
    const scope = roleAndScope(form);
    if (user.id === admin.id && scope.role !== "super_admin") back("/admin/staff", "You can't remove your own super admin role.", "error");
    await db.update(users).set(scope).where(eq(users.id, id));
    await audit(admin, "staff_role_changed", `${user.email}: ${scope.role}`);
    back("/admin/staff", `Updated ${user.email}.`);
  }
  if (intent === "toggle") {
    if (user.id === admin.id) back("/admin/staff", "You can't deactivate yourself.", "error");
    await db.update(users).set({ active: !user.active }).where(eq(users.id, id));
    await audit(admin, user.active ? "staff_deactivated" : "staff_reactivated", user.email);
    back("/admin/staff", `${user.email} ${user.active ? "deactivated" : "reactivated"}.`);
  }
  if (intent === "reset") {
    const password = tempPassword();
    await db
      .update(users)
      .set({ passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true, passwordChangedAt: new Date() })
      .where(eq(users.id, id));
    await audit(admin, "staff_password_reset", user.email);
    back("/admin/staff", `New temporary password for ${user.email}: ${password} (shown once).`);
  }
  if (intent === "email_reset") {
    if (!user.active) back("/admin/staff", `${user.email} is deactivated. Reactivate them first.`, "error");
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const res = await sendResetLink(user, host ? `${h.get("x-forwarded-proto") ?? "http"}://${host}` : undefined, admin.name);
    await audit(admin, res.ok ? "staff_reset_link_sent" : "staff_reset_link_failed", user.email);
    if (!res.ok) back("/admin/staff", `Couldn't email ${user.email}: ${res.error}`, "error");
    back("/admin/staff", `Emailed a reset link to ${user.email}. It works once, for an hour.`);
  }
  back("/admin/staff", "Nothing changed.");
}
