import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { auditLogs } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/current";

export const metadata = { title: "Activity" };

const when = (d: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(d);

export default async function Activity() {
  await requireUser({ roles: ["super_admin"] });
  const rows = await getDb().select().from(auditLogs).orderBy(desc(auditLogs.at)).limit(300);
  return (
    <div>
      <h1 className="font-serif text-3xl">Activity</h1>
      <p className="mb-4 mt-1 text-sm text-stone-500">The latest 300 sign-ins and changes, newest first.</p>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              <th className="th">When</th>
              <th className="th">Who</th>
              <th className="th">What</th>
              <th className="th">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td whitespace-nowrap">{when(r.at)}</td>
                <td className="td">{r.userEmail}</td>
                <td className="td">{r.action.replace(/_/g, " ")}</td>
                <td className="td text-stone-600">{r.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
