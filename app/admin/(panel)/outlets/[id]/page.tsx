import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { menuShares, menus, openingHours, outlets } from "@/lib/db/schema";
import { outletFor } from "@/lib/admin/access";
import { first } from "@/lib/admin/form";
import { OUTLET_KINDS } from "@/lib/admin/kinds";
import { canEditProperty } from "@/lib/auth/roles";
import { Flash } from "@/components/admin/Flash";
import { HoursEditor } from "@/components/admin/HoursEditor";
import { ImageField } from "@/components/admin/ImageField";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createMenu, deleteOutlet, moveMenu, saveHours, updateOutlet } from "../actions";

export const metadata = { title: "Outlet" };

export default async function OutletPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, outlet: o, property } = await outletFor(Number((await params).id));
  const sp = await searchParams;
  const db = getDb();
  const hours = await db
    .select()
    .from(openingHours)
    .where(eq(openingHours.outletId, o.id))
    .orderBy(asc(openingHours.sortOrder), asc(openingHours.id));
  const own = await db.select().from(menus).where(eq(menus.outletId, o.id));
  const shared = await db
    .select({ share: menuShares, menu: menus, owner: outlets })
    .from(menuShares)
    .innerJoin(menus, eq(menus.id, menuShares.menuId))
    .innerJoin(outlets, eq(outlets.id, menus.outletId))
    .where(eq(menuShares.outletId, o.id));
  const menuRows = [
    ...own.map((m) => ({ key: `m${m.id}`, sortOrder: m.sortOrder, menu: m, sharedFrom: null as string | null })),
    ...shared.map((s) => ({ key: `s${s.share.id}`, sortOrder: s.share.sortOrder, menu: s.menu, sharedFrom: s.owner.name })),
  ].sort((a, b) => a.sortOrder - b.sortOrder);
  const isAdmin = canEditProperty(user, o.propertyId);

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-stone-500">
        {isAdmin ? (
          <>
            <Link href={`/admin/properties/${property.id}/outlets`} className="hover:underline">
              {property.name}
            </Link>{" "}
            /
          </>
        ) : (
          property.name
        )}
      </p>
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3">
        <h1 className="font-serif text-3xl">{o.name}</h1>
        <a href={`/${property.slug}/dining/${o.slug}`} target="_blank" className="text-sm text-brand hover:underline">
          View as a guest ↗
        </a>
        {!o.isPublished && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Hidden from guests</span>}
      </div>
      <Flash msg={first(sp.msg)} err={first(sp.err)} />

      <form action={updateOutlet} className="panel grid gap-4 p-5 sm:grid-cols-2">
        <input type="hidden" name="id" value={o.id} />
        <label className="block">
          <span className="label">Name</span>
          <input name="name" defaultValue={o.name} className="input" />
        </label>
        <label className="block">
          <span className="label">Type</span>
          <select name="kind" defaultValue={o.kind} className="input">
            {OUTLET_KINDS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Description</span>
          <textarea name="description" rows={3} defaultValue={o.description ?? ""} className="input" />
        </label>
        <ImageField name="imageUrl" label="Photo" defaultValue={o.imageUrl} propertyId={o.propertyId} />
        <ImageField name="logoUrl" label="Logo (optional)" defaultValue={o.logoUrl} propertyId={o.propertyId} />
        <label className="block">
          <span className="label">Location</span>
          <input name="location" defaultValue={o.location ?? ""} placeholder="e.g. Ground floor, by the pool" className="input" />
        </label>
        <label className="block">
          <span className="label">Room phone extension</span>
          <input name="extension" defaultValue={o.extension ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="label">Phone</span>
          <input name="phone" defaultValue={o.phone ?? ""} className="input" />
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="isPublished" defaultChecked={o.isPublished} className="h-4 w-4 accent-brand" />
          Show to guests
        </label>
        <div className="sm:col-span-2">
          <SubmitButton>Save</SubmitButton>
        </div>
      </form>

      <HoursEditor hours={hours} action={saveHours} ownerField="outletId" ownerId={o.id} />

      <>
          <h2 id="menus" className="mb-2 mt-8 font-serif text-2xl">
            Menus
          </h2>
          <ul className="panel divide-y divide-stone-100">
            {menuRows.map((r) => (
              <li key={r.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  {r.sharedFrom ? (
                    <span className="font-medium">{r.menu.name}</span>
                  ) : (
                    <Link href={`/admin/menus/${r.menu.id}`} className="font-medium hover:text-brand">
                      {r.menu.name}
                    </Link>
                  )}
                  <p className="text-xs text-stone-500">
                    {r.sharedFrom ? `Shared from ${r.sharedFrom}: edited there` : r.menu.isSpecial ? "Special" : "Menu"}
                    {!r.menu.isPublished && <span className="ml-2 font-semibold text-amber-800">Hidden</span>}
                  </p>
                </div>
                <form action={moveMenu} className="flex gap-1">
                  <input type="hidden" name="outletId" value={o.id} />
                  <input type="hidden" name="key" value={r.key} />
                  <SubmitButton className="btn btn-sm" name="intent" value="up">
                    ↑
                  </SubmitButton>
                  <SubmitButton className="btn btn-sm" name="intent" value="down">
                    ↓
                  </SubmitButton>
                </form>
                {!r.sharedFrom && (
                  <Link href={`/admin/menus/${r.menu.id}`} className="btn btn-sm">
                    Edit
                  </Link>
                )}
              </li>
            ))}
            {menuRows.length === 0 && <li className="px-4 py-6 text-sm text-stone-500">No menus yet.</li>}
          </ul>
          <form action={createMenu} className="panel mt-3 flex flex-wrap items-end gap-3 border-dashed p-4">
            <input type="hidden" name="outletId" value={o.id} />
            <label className="min-w-48 flex-1">
              <span className="label">New menu</span>
              <input name="name" placeholder="e.g. Dinner, Specials, Kids menu" required className="input" />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="isSpecial" className="h-4 w-4 accent-brand" />
              It&apos;s a special (with dates)
            </label>
            <SubmitButton>Create menu</SubmitButton>
          </form>
      </>

      {isAdmin && (
        <form action={deleteOutlet} className="mt-10 rounded-xl border border-red-200 bg-white p-5">
          <h2 className="font-semibold text-red-800">Delete {o.name}</h2>
          <p className="mt-1 text-sm text-stone-600">Deletes it with its hours and menus. This can&apos;t be undone. To hide it instead, untick “Show to guests”.</p>
          <input type="hidden" name="id" value={o.id} />
          <div className="mt-3 flex flex-wrap gap-2">
            <input name="confirmName" placeholder={`Type "${o.name}" to confirm`} className="input max-w-xs" />
            <SubmitButton className="btn-danger">Delete</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
