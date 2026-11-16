import Link from "next/link";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { facilities, facilityServices } from "@/lib/db/schema";
import { propertyFor } from "@/lib/admin/access";
import { first } from "@/lib/admin/form";
import { Flash } from "@/components/admin/Flash";
import { Icon } from "@/components/Icon";
import { IconSelect } from "@/components/admin/ListEditor";
import { PropertyTabs } from "@/components/admin/PropertyTabs";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createFacility, moveFacility } from "../../../facilities/actions";

export const metadata = { title: "Facilities" };

export default async function Facilities({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { property } = await propertyFor(Number((await params).id));
  const sp = await searchParams;
  const db = getDb();
  const rows = await db
    .select()
    .from(facilities)
    .where(eq(facilities.propertyId, property.id))
    .orderBy(asc(facilities.sortOrder), asc(facilities.id));
  const counts = rows.length
    ? await db
        .select({ facilityId: facilityServices.facilityId, n: sql<number>`count(*)::int` })
        .from(facilityServices)
        .where(inArray(facilityServices.facilityId, rows.map((r) => r.id)))
        .groupBy(facilityServices.facilityId)
    : [];

  return (
    <div className="max-w-3xl">
      <PropertyTabs property={property} active="/facilities" />
      <p className="mb-4 text-sm text-stone-500">
        Facilities are the services around the property, such as the pools or housekeeping. Each has its own page for guests with details,
        hours and a list of services. When guest requests are switched on (in Details), guests can ask for a service from that page.
      </p>
      <Flash msg={first(sp.msg)} err={first(sp.err)} />
      <ul className="panel divide-y divide-stone-100">
        {rows.map((f) => {
          const n = counts.find((c) => c.facilityId === f.id)?.n ?? 0;
          return (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                <Icon name={f.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/facilities/${f.id}`} className="font-medium hover:text-brand">
                  {f.name}
                </Link>
                <p className="text-xs text-stone-500">
                  {n === 1 ? "1 service" : `${n} services`}
                  {!f.isPublished && <span className="ml-2 font-semibold text-amber-800">Hidden</span>}
                </p>
              </div>
              <form action={moveFacility} className="flex gap-1">
                <input type="hidden" name="propertyId" value={property.id} />
                <input type="hidden" name="id" value={f.id} />
                <SubmitButton className="btn btn-sm" name="intent" value="up">
                  ↑
                </SubmitButton>
                <SubmitButton className="btn btn-sm" name="intent" value="down">
                  ↓
                </SubmitButton>
              </form>
              <Link href={`/admin/facilities/${f.id}`} className="btn btn-sm">
                Edit
              </Link>
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-4 py-6 text-sm text-stone-500">No facilities yet.</li>}
      </ul>

      <form action={createFacility} className="panel mt-6 flex flex-wrap items-end gap-3 p-4">
        <input type="hidden" name="propertyId" value={property.id} />
        <label className="min-w-48 flex-1">
          <span className="label">Add a facility</span>
          <input name="name" placeholder="e.g. Pools, Housekeeping, Gym" required className="input" />
        </label>
        <label>
          <span className="label">Icon</span>
          <IconSelect value="sparkle" />
        </label>
        <SubmitButton>Add</SubmitButton>
      </form>
    </div>
  );
}
