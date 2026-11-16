import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { outlets, properties, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/current";
import { ROLES, ROLE_HELP, ROLE_LABELS, isRole } from "@/lib/auth/roles";
import { first } from "@/lib/admin/form";
import { Flash } from "@/components/admin/Flash";
import { RoleScopeFields } from "@/components/admin/RoleScopeFields";
import { emailConfigured } from "@/lib/email";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createStaff, updateStaff } from "./actions";

export const metadata = { title: "Staff" };

const when = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(d) : "Never";

export default async function Staff({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const emailOn = emailConfigured();
  const me = await requireUser({ roles: ["super_admin"] });
  const sp = await searchParams;
  const db = getDb();
  const list = await db.select().from(users).orderBy(asc(users.name));
  const props = await db.select({ id: properties.id, name: properties.name }).from(properties).orderBy(asc(properties.sortOrder));
  const outs = await db
    .select({ id: outlets.id, name: outlets.name, property: properties.name })
    .from(outlets)
    .innerJoin(properties, eq(properties.id, outlets.propertyId))
    .orderBy(asc(properties.sortOrder), asc(outlets.sortOrder));

  return (
    <div>
      <h1 className="font-serif text-3xl">Staff</h1>
      <ul className="mb-4 mt-2 space-y-0.5 text-sm text-stone-600">
        {ROLES.map((r) => (
          <li key={r}>
            <b>{ROLE_LABELS[r]}:</b> {ROLE_HELP[r]}
          </li>
        ))}
      </ul>
      <Flash msg={first(sp.msg)} err={first(sp.err)} />

      <form action={createStaff} className="panel mb-6 flex flex-wrap items-end gap-2 p-4">
        <label>
          <span className="label">Name</span>
          <input name="name" required className="input w-48" />
        </label>
        <label>
          <span className="label">Email</span>
          <input name="email" type="email" required className="input w-60" />
        </label>
        <div>
          <span className="label">Role</span>
          <RoleScopeFields properties={props} outlets={outs} />
        </div>
        <SubmitButton>Add staff</SubmitButton>
      </form>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">Role and scope</th>
              <th className="th">Last sign-in</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className={u.active ? "" : "text-stone-400"}>
                <td className="td">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-stone-500">{u.email}</div>
                  {!u.active && <div className="text-xs font-semibold">Deactivated</div>}
                </td>
                <td className="td">
                  <form action={updateStaff} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="intent" value="role" />
                    <RoleScopeFields
                      properties={props}
                      outlets={outs}
                      role={isRole(u.role) ? u.role : "outlet_manager"}
                      propertyId={u.propertyId}
                      outletId={u.outletId}
                      disabled={u.id === me.id}
                    />
                    {u.id !== me.id && <SubmitButton className="btn btn-sm">Save</SubmitButton>}
                  </form>
                </td>
                <td className="td">{when(u.lastLogin)}</td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    {emailOn && u.active && (
                      <form action={updateStaff}>
                        <input type="hidden" name="id" value={u.id} />
                        <SubmitButton className="btn btn-sm" name="intent" value="email_reset" confirm={`Email ${u.name} a link to choose a new password?`}>
                          Email reset link
                        </SubmitButton>
                      </form>
                    )}
                    <form action={updateStaff}>
                      <input type="hidden" name="id" value={u.id} />
                      <SubmitButton className="btn btn-sm" name="intent" value="reset" confirm={`Reset ${u.name}'s password?`}>
                        Reset password
                      </SubmitButton>
                    </form>
                    {u.id !== me.id && (
                      <form action={updateStaff}>
                        <input type="hidden" name="id" value={u.id} />
                        <SubmitButton className="btn btn-sm" name="intent" value="toggle">
                          {u.active ? "Deactivate" : "Reactivate"}
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
