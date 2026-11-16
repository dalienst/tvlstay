import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { amenities } from "@/lib/db/schema";
import { propertyFor } from "@/lib/admin/access";
import { first } from "@/lib/admin/form";
import { Flash } from "@/components/admin/Flash";
import { ListEditor } from "@/components/admin/ListEditor";
import { PropertyTabs } from "@/components/admin/PropertyTabs";

export const metadata = { title: "In the apartment" };

export default async function Page({
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
    .from(amenities)
    .where(eq(amenities.propertyId, property.id))
    .orderBy(asc(amenities.sortOrder), asc(amenities.id));
  return (
    <div className="max-w-3xl">
      <PropertyTabs property={property} active="/amenities" />
      <p className="mb-4 text-sm text-stone-500">What every apartment has, shown under “In your apartment” on the guest Facilities page. Pools, housekeeping and other services guests can request go under <a href={`/admin/properties/${property.id}/facilities`} className="text-brand underline">Facilities</a>.</p>
      <Flash msg={first(sp.msg)} err={first(sp.err)} />
      <ListEditor
        kind="amenities"
        propertyId={property.id}
        textLabel="Short description (optional)"
        rows={rows.map((r) => ({ id: r.id, icon: r.icon, title: r.title, text: r.description ?? "", isPublished: r.isPublished }))}
      />
    </div>
  );
}
