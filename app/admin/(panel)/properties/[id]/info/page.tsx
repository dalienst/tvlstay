import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { infoItems } from "@/lib/db/schema";
import { propertyFor } from "@/lib/admin/access";
import { first } from "@/lib/admin/form";
import { Flash } from "@/components/admin/Flash";
import { ListEditor } from "@/components/admin/ListEditor";
import { PropertyTabs } from "@/components/admin/PropertyTabs";

export const metadata = { title: "Guest info" };

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
    .from(infoItems)
    .where(eq(infoItems.propertyId, property.id))
    .orderBy(asc(infoItems.sortOrder), asc(infoItems.id));
  return (
    <div className="max-w-3xl">
      <PropertyTabs property={property} active="/info" />
      <p className="mb-4 text-sm text-stone-500">House information on the Info page: Wi-Fi, room service, housekeeping, laundry, house rules, transfers…</p>
      <Flash msg={first(sp.msg)} err={first(sp.err)} />
      <ListEditor
        kind="info"
        propertyId={property.id}
        textLabel="Text"
        rows={rows.map((r) => ({ id: r.id, icon: r.icon, title: r.title, text: r.body, isPublished: r.isPublished }))}
      />
    </div>
  );
}
