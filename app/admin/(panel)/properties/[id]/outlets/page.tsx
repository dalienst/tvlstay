import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { outlets } from "@/lib/db/schema";
import { propertyFor } from "@/lib/admin/access";
import { first } from "@/lib/admin/form";
import { OUTLET_KINDS, kindLabel } from "@/lib/admin/kinds";
import { Flash } from "@/components/admin/Flash";
import { PropertyTabs } from "@/components/admin/PropertyTabs";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createOutlet, moveOutlet } from "../../actions";

export const metadata = { title: "Dining" };

export default async function Outlets({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { property } = await propertyFor(Number((await params).id));
  const sp = await searchParams;
  const rows = await getDb()
    .select()
    .from(outlets)
    .where(eq(outlets.propertyId, property.id))
    .orderBy(asc(outlets.sortOrder), asc(outlets.id));

  return (
    <div className="max-w-3xl">
      <PropertyTabs property={property} active="/outlets" />
      <p className="mb-4 text-sm text-stone-500">
        <b>Outlets</b> are the places with menus: restaurants, bars, terraces. Guests find them under Dining. Click an outlet&apos;s name or{" "}
        <b>Edit</b> to change its details, photo, hours and menus. Pools, housekeeping and other services are under{" "}
        <a href={`/admin/properties/${property.id}/facilities`} className="text-brand underline">
          Facilities
        </a>
        .
      </p>
      <Flash msg={first(sp.msg)} err={first(sp.err)} />
      <ul className="panel divide-y divide-stone-100">
        {rows.map((o) => (
          <li key={o.id} className="flex items-center gap-3 px-4 py-3">
            {o.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={o.imageUrl} alt="" className="h-12 w-16 rounded-md object-cover" />
            ) : (
              <span className="h-12 w-16 rounded-md bg-stone-100" />
            )}
            <div className="min-w-0 flex-1">
              <Link href={`/admin/outlets/${o.id}`} className="font-medium hover:text-brand">
                {o.name}
              </Link>
              <p className="text-xs text-stone-500">
                {kindLabel(o.kind)}
                {!o.isPublished && <span className="ml-2 font-semibold text-amber-800">Hidden</span>}
              </p>
            </div>
            <form action={moveOutlet} className="flex gap-1">
              <input type="hidden" name="propertyId" value={property.id} />
              <input type="hidden" name="id" value={o.id} />
              <SubmitButton className="btn btn-sm" name="intent" value="up">
                ↑
              </SubmitButton>
              <SubmitButton className="btn btn-sm" name="intent" value="down">
                ↓
              </SubmitButton>
            </form>
            <Link href={`/admin/outlets/${o.id}`} className="btn btn-sm">
              Edit
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-6 text-sm text-stone-500">Nothing yet.</li>}
      </ul>

      <form action={createOutlet} className="panel mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <input type="hidden" name="propertyId" value={property.id} />
        <label>
          <span className="label">Add a restaurant, bar or other outlet</span>
          <input name="name" placeholder="e.g. Pool Bar" required className="input" />
        </label>
        <label>
          <span className="label">Type</span>
          <select name="kind" className="input" defaultValue="restaurant">
            {OUTLET_KINDS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton>Add</SubmitButton>
      </form>
    </div>
  );
}
