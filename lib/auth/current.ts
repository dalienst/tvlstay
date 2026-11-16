import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { users } from "@/lib/db/schema";
import { COOKIE_NAME, readSessionToken, startedAfter } from "./session";
import { isRole, type Role } from "./roles";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  propertyId: number | null;
  outletId: number | null;
  mustChangePassword: boolean;
};

/** The signed-in user, re-read from the database so a deactivated account or new role applies at once. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSessionToken((await cookies()).get(COOKIE_NAME)?.value);
  if (!session) return null;
  const [row] = await getDb().select().from(users).where(eq(users.id, session.id)).limit(1);
  if (!row || !row.active || !isRole(row.role)) return null;
  // A password change or reset signs out every older session.
  if (!startedAfter(session.iat, row.passwordChangedAt)) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    propertyId: row.propertyId,
    outletId: row.outletId,
    mustChangePassword: row.mustChangePassword,
  };
}

/** For admin pages and actions: sends signed-out users to the login page and temporary passwords to /admin/account. */
export async function requireUser(opts: { roles?: Role[]; allowTemporaryPassword?: boolean } = {}): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.mustChangePassword && !opts.allowTemporaryPassword) redirect("/admin/account");
  if (opts.roles && !opts.roles.includes(user.role)) redirect("/admin");
  return user;
}
