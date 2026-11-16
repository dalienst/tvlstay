import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { menuItems, menuSections, menuShares, outlets, properties } from "@/lib/db/schema";
import { menuFor } from "@/lib/admin/access";
import { first } from "@/lib/admin/form";
import { canEditProperty } from "@/lib/auth/roles";
import { priceText } from "@/lib/menu-text";
import { todayInNairobi } from "@/lib/time";
import { Flash } from "@/components/admin/Flash";
import { ImageField } from "@/components/admin/ImageField";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { addItem, deleteMenu, saveItem, saveSection, updateMenu } from "../actions";

export const metadata = { title: "Menu" };

const TAGS: [string, string][] = [
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["spicy", "Spicy"],
  ["seafood", "Seafood"],
  ["gluten-free", "Gluten free"],
  ["sugar-free", "Sugar free"],
  ["alcohol-free", "Alcohol free"],
  ["signature", "Signature"],
  ["new", "New"],
];

const PRICE_HINT = "e.g. 1900, or Glass=1300; Bottle=5000, or Bottle=5200 was 6500 for a sale. Leave empty to show no price.";

type ItemRow = typeof menuItems.$inferSelect;

function ItemFields({ item, propertyId }: { item?: ItemRow; propertyId: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="label">Name</span>
        <input name="name" defaultValue={item?.name} required className="input" />
      </label>
      <label className="block">
        <span className="label">Price</span>
        <input name="prices" defaultValue={item ? priceText(item.prices) : ""} className="input" />
        <span className="hint">{PRICE_HINT}</span>
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Description</span>
        <textarea name="description" rows={2} defaultValue={item?.description ?? ""} className="input" />
      </label>
      <label className="block">
        <span className="label">Note when there&apos;s no price (optional)</span>
        <input name="priceNote" defaultValue={item?.priceNote ?? ""} placeholder="e.g. Market price, Ask your server" className="input" />
      </label>
      <div>
        <span className="label">Labels</span>
        <div className="flex flex-wrap gap-1">
          {TAGS.map(([v, l]) => (
            <label key={v} className="flex items-center gap-1 rounded-md border border-stone-200 px-1.5 py-1 text-xs">
              <input type="checkbox" name="tags" value={v} defaultChecked={item?.tags.includes(v)} className="accent-brand" />
              {l}
            </label>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <ImageField name="imageUrl" label="Photo (optional)" defaultValue={item?.imageUrl} propertyId={propertyId} />
      </div>
    </div>
  );
}

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, menu, outlet, property } = await menuFor(Number((await params).id));
  const sp = await searchParams;
  const db = getDb();
  const sections = await db
    .select()
    .from(menuSections)
    .where(eq(menuSections.menuId, menu.id))
    .orderBy(asc(menuSections.sortOrder), asc(menuSections.id));
  const items = sections.length
    ? await db
        .select()
        .from(menuItems)
        .where(
          inArray(
            menuItems.sectionId,
            sections.map((s) => s.id),
          ),
        )
        .orderBy(asc(menuItems.sortOrder), asc(menuItems.id))
    : [];
  const canShare = canEditProperty(user, outlet.propertyId);
  const shares = await db.select().from(menuShares).where(eq(menuShares.menuId, menu.id));
  const shareTargets = canShare
    ? (
        await db
          .select({ id: outlets.id, name: outlets.name, kind: outlets.kind, property: properties.name, propertyId: properties.id })
          .from(outlets)
          .innerJoin(properties, eq(properties.id, outlets.propertyId))
          .orderBy(asc(properties.sortOrder), asc(outlets.sortOrder))
      ).filter((o) => o.id !== outlet.id && (user.role === "super_admin" || o.propertyId === outlet.propertyId))
    : [];
  const today = todayInNairobi();
  const outOfDates = (menu.startsOn && today < menu.startsOn) || (menu.endsOn && today > menu.endsOn);

  return (
    <div className="max-w-4xl">
      <p className="text-sm text-stone-500">
        {property.name} /{" "}
        <Link href={`/admin/outlets/${outlet.id}#menus`} className="hover:underline">
          {outlet.name}
        </Link>{" "}
        /
      </p>
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3">
        <h1 className="font-serif text-3xl">{menu.name}</h1>
        <a href={`/${property.slug}/dining/${outlet.slug}/${menu.slug}`} target="_blank" className="text-sm text-brand hover:underline">
          View as a guest ↗
        </a>
        {!menu.isPublished && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Hidden from guests</span>}
        {menu.isPublished && outOfDates && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Outside its dates: guests don&apos;t see it</span>
        )}
      </div>
      <Flash msg={first(sp.msg)} err={first(sp.err)} />

      <details className="panel mb-6 p-4" open={sections.length === 0}>
        <summary className="cursor-pointer font-semibold">Menu settings</summary>
        <form action={updateMenu} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={menu.id} />
          <label className="block">
            <span className="label">Menu name</span>
            <input name="name" defaultValue={menu.name} className="input" />
          </label>
          <label className="block">
            <span className="label">When it&apos;s served</span>
            <input name="servedNote" defaultValue={menu.servedNote ?? ""} placeholder="e.g. Served 5am to 11am" className="input" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Introduction (optional)</span>
            <textarea name="description" rows={2} defaultValue={menu.description ?? ""} className="input" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Footnote (optional)</span>
            <input name="footnote" defaultValue={menu.footnote ?? ""} placeholder="e.g. A 10% service charge applies" className="input" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isSpecial" defaultChecked={menu.isSpecial} className="h-4 w-4 accent-brand" />
            Special or seasonal menu
          </label>
          <div className="flex flex-wrap gap-3">
            <label>
              <span className="label">Show from</span>
              <input type="date" name="startsOn" defaultValue={menu.startsOn ?? ""} className="input" />
            </label>
            <label>
              <span className="label">Until</span>
              <input type="date" name="endsOn" defaultValue={menu.endsOn ?? ""} className="input" />
            </label>
            <span className="hint w-full">Optional. Outside these dates guests don&apos;t see the menu.</span>
          </div>
          {canShare && shareTargets.length > 0 && (
            <fieldset className="sm:col-span-2">
              <input type="hidden" name="sharesShown" value="1" />
              <legend className="label">Also show this menu at</legend>
              <div className="flex flex-wrap gap-2">
                {shareTargets.map((o) => (
                  <label key={o.id} className="flex items-center gap-1.5 rounded-md border border-stone-200 px-2 py-1 text-sm">
                    <input type="checkbox" name="shareWith" value={o.id} defaultChecked={shares.some((s) => s.outletId === o.id)} className="accent-brand" />
                    {o.name} <span className="text-xs text-stone-400">({o.property})</span>
                  </label>
                ))}
              </div>
              <span className="hint">Edits here show everywhere it&apos;s shared.</span>
            </fieldset>
          )}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="isPublished" defaultChecked={menu.isPublished} className="h-4 w-4 accent-brand" />
            Show to guests
          </label>
          <div className="sm:col-span-2">
            <SubmitButton>Save settings</SubmitButton>
          </div>
        </form>
      </details>

      {sections.length > 1 && (
        <nav className="mb-4 flex flex-wrap gap-2 text-sm">
          {sections.map((s) => (
            <a key={s.id} href={`#s-${s.id}`} className="rounded-full border border-stone-200 bg-white px-3 py-1 hover:border-brand/50">
              {s.name}
            </a>
          ))}
        </nav>
      )}

      <div className="space-y-6">
        {sections.map((s) => {
          const list = items.filter((i) => i.sectionId === s.id);
          return (
            <section key={s.id} id={`s-${s.id}`} className="panel scroll-mt-4">
              <form action={saveSection} className="flex flex-wrap items-end gap-2 border-b border-stone-100 p-4">
                <input type="hidden" name="id" value={s.id} />
                <label className="min-w-48 flex-1">
                  <span className="label">Section</span>
                  <input name="name" defaultValue={s.name} className="input font-semibold" />
                </label>
                <label className="min-w-48 flex-[2]">
                  <span className="label">Section note (optional)</span>
                  <input name="description" defaultValue={s.description ?? ""} className="input" />
                </label>
                <label className="flex items-center gap-1.5 pb-2 text-sm">
                  <input type="checkbox" name="isPublished" defaultChecked={s.isPublished} className="accent-brand" />
                  Show
                </label>
                <div className="flex gap-1 pb-0.5">
                  <SubmitButton className="btn btn-sm" name="intent" value="up">
                    ↑
                  </SubmitButton>
                  <SubmitButton className="btn btn-sm" name="intent" value="down">
                    ↓
                  </SubmitButton>
                  <SubmitButton
                    className="btn-danger btn-sm"
                    name="intent"
                    value="delete"
                    confirm={`Delete the section "${s.name}" and its ${list.length} items?`}
                  >
                    Delete
                  </SubmitButton>
                  <SubmitButton className="btn-primary btn-sm" name="intent" value="save">
                    Save
                  </SubmitButton>
                </div>
              </form>

              <ul className="divide-y divide-stone-100">
                {list.map((i) => (
                  <li key={i.id} id={`i-${i.id}`} className={`scroll-mt-4 px-4 py-2.5 ${i.isPublished ? "" : "bg-stone-50"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      {i.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={i.imageUrl} alt="" className="h-9 w-9 rounded object-cover" />
                      )}
                      <span className={`min-w-0 flex-1 text-sm ${i.isAvailable ? "" : "text-stone-400 line-through"}`}>
                        <span className="font-medium">{i.name}</span>
                        {!i.isPublished && <span className="ml-2 text-xs font-semibold text-amber-800 no-underline">Hidden</span>}
                      </span>
                      <span className="text-sm tabular-nums text-stone-600">{priceText(i.prices).replace(/=/g, " ") || i.priceNote || "No price"}</span>
                      <form action={saveItem}>
                        <input type="hidden" name="id" value={i.id} />
                        <SubmitButton className={i.isAvailable ? "btn btn-sm" : "btn-primary btn-sm"} name="intent" value="availability">
                          {i.isAvailable ? "Sold out" : "Available again"}
                        </SubmitButton>
                      </form>
                    </div>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-brand">Edit</summary>
                      <form action={saveItem} className="mt-3 rounded-lg bg-stone-50 p-3">
                        <input type="hidden" name="id" value={i.id} />
                        <ItemFields item={i} propertyId={property.id} />
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-1.5 text-sm">
                            <input type="checkbox" name="isAvailable" defaultChecked={i.isAvailable} className="accent-brand" />
                            Available today
                          </label>
                          <label className="flex items-center gap-1.5 text-sm">
                            <input type="checkbox" name="isPublished" defaultChecked={i.isPublished} className="accent-brand" />
                            Show to guests
                          </label>
                          {sections.length > 1 && (
                            <label className="flex items-center gap-1.5 text-sm">
                              Section
                              <select name="sectionId" defaultValue={s.id} className="input w-auto py-1">
                                {sections.map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          <span className="ml-auto flex gap-1">
                            <SubmitButton className="btn btn-sm" name="intent" value="up">
                              ↑
                            </SubmitButton>
                            <SubmitButton className="btn btn-sm" name="intent" value="down">
                              ↓
                            </SubmitButton>
                            <SubmitButton className="btn-danger btn-sm" name="intent" value="delete" confirm={`Delete "${i.name}"?`}>
                              Delete
                            </SubmitButton>
                            <SubmitButton className="btn-primary btn-sm" name="intent" value="save">
                              Save
                            </SubmitButton>
                          </span>
                        </div>
                      </form>
                    </details>
                  </li>
                ))}
              </ul>

              <details className="border-t border-stone-100 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-brand">+ Add an item to {s.name}</summary>
                <form action={addItem} className="mt-3 rounded-lg bg-stone-50 p-3">
                  <input type="hidden" name="sectionId" value={s.id} />
                  <ItemFields propertyId={property.id} />
                  <div className="mt-3">
                    <SubmitButton>Add item</SubmitButton>
                  </div>
                </form>
              </details>
            </section>
          );
        })}
      </div>

      <form action={saveSection} className="panel mt-6 flex flex-wrap items-end gap-3 border-dashed p-4">
        <input type="hidden" name="menuId" value={menu.id} />
        <label className="min-w-48 flex-1">
          <span className="label">Add a section</span>
          <input name="name" placeholder="e.g. Starters" required className="input" />
        </label>
        <SubmitButton>Add section</SubmitButton>
      </form>

      <form action={deleteMenu} className="mt-10 rounded-xl border border-red-200 bg-white p-5">
        <h2 className="font-semibold text-red-800">Delete this menu</h2>
        <p className="mt-1 text-sm text-stone-600">
          Deletes {menu.name} with all its sections and items{shares.length ? `, including where it's shared` : ""}. This can&apos;t be undone.
        </p>
        <input type="hidden" name="id" value={menu.id} />
        <div className="mt-3 flex flex-wrap gap-2">
          <input name="confirmName" placeholder={`Type "${menu.name}" to confirm`} className="input max-w-xs" />
          <SubmitButton className="btn-danger">Delete menu</SubmitButton>
        </div>
      </form>
    </div>
  );
}
