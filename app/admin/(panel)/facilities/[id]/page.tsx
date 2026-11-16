import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { facilityServices, openingHours } from "@/lib/db/schema";
import { facilityFor } from "@/lib/admin/access";
import { first } from "@/lib/admin/form";
import { priceText } from "@/lib/menu-text";
import type { ItemPrice } from "@/lib/db/schema";
import { Flash } from "@/components/admin/Flash";
import { HoursEditor } from "@/components/admin/HoursEditor";
import { ImageField } from "@/components/admin/ImageField";
import { IconSelect } from "@/components/admin/ListEditor";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { deleteFacility, saveFacilityHours, saveService, updateFacility } from "../actions";

export const metadata = { title: "Facility" };

type ServiceRow = {
  name: string;
  description: string | null;
  prices: ItemPrice[];
  priceNote: string | null;
  imageUrl: string | null;
  isRequestable: boolean;
  isPublished: boolean;
};

function ServiceFields({ s, propertyId }: { s?: ServiceRow; propertyId: number }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Service</span>
          <input name="name" defaultValue={s?.name} placeholder="e.g. Towel service, Swedish massage" required className="input" />
        </label>
        <label>
          <span className="label">Price in KES (optional)</span>
          <input name="prices" defaultValue={s ? priceText(s.prices) : ""} placeholder="e.g. 5000, or 60 min=5000; 90 min=7000" className="input" />
          <span className="hint">
            One price: <code>5000</code>. Options: <code>60 min=5000; 90 min=7000</code>. Guests pick an option when they request it. Empty
            means no price shown.
          </span>
        </label>
        <label>
          <span className="label">Price note (optional)</span>
          <input name="priceNote" defaultValue={s?.priceNote ?? ""} placeholder="e.g. Free, or Charged to your room" className="input" />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Description (optional)</span>
          <input name="description" defaultValue={s?.description ?? ""} placeholder="e.g. Fresh pool towels brought to your sun lounger" className="input" />
        </label>
        <div className="sm:col-span-2">
          <ImageField name="imageUrl" label="Photo (optional)" defaultValue={s?.imageUrl} propertyId={propertyId} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isRequestable" defaultChecked={s ? s.isRequestable : true} className="h-4 w-4 accent-brand" />
          Guests can request it
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isPublished" defaultChecked={s ? s.isPublished : true} className="h-4 w-4 accent-brand" />
          Show to guests
        </label>
      </div>
    </>
  );
}

export default async function FacilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { facility: f, property } = await facilityFor(Number((await params).id));
  const sp = await searchParams;
  const db = getDb();
  const [hours, services] = await Promise.all([
    db.select().from(openingHours).where(eq(openingHours.facilityId, f.id)).orderBy(asc(openingHours.sortOrder), asc(openingHours.id)),
    db.select().from(facilityServices).where(eq(facilityServices.facilityId, f.id)).orderBy(asc(facilityServices.sortOrder), asc(facilityServices.id)),
  ]);

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-stone-500">
        <Link href={`/admin/properties/${property.id}/facilities`} className="hover:underline">
          {property.name} · Facilities
        </Link>{" "}
        /
      </p>
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3">
        <h1 className="font-serif text-3xl">{f.name}</h1>
        <a href={`/${property.slug}/facilities/${f.slug}`} target="_blank" className="text-sm text-brand hover:underline">
          View as a guest ↗
        </a>
        {!f.isPublished && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Hidden from guests</span>}
      </div>
      <Flash msg={first(sp.msg)} err={first(sp.err)} />

      <form action={updateFacility} className="panel grid gap-4 p-5 sm:grid-cols-2">
        <input type="hidden" name="id" value={f.id} />
        <label className="block">
          <span className="label">Name</span>
          <input name="name" defaultValue={f.name} className="input" />
        </label>
        <label className="block">
          <span className="label">Icon</span>
          <IconSelect value={f.icon} />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Short summary</span>
          <input name="summary" defaultValue={f.summary ?? ""} placeholder="One line for the Facilities list" className="input" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Details</span>
          <textarea name="details" rows={5} defaultValue={f.details ?? ""} className="input" />
          <span className="hint">Shown on the facility&apos;s page. Blank lines start a new paragraph.</span>
        </label>
        <ImageField name="imageUrl" label="Photo" defaultValue={f.imageUrl} propertyId={f.propertyId} />
        <div className="grid content-start gap-4">
          <label className="block">
            <span className="label">Location</span>
            <input name="location" defaultValue={f.location ?? ""} placeholder="e.g. Rooftop, level 4" className="input" />
          </label>
          <label className="block">
            <span className="label">Room phone extension</span>
            <input name="extension" defaultValue={f.extension ?? ""} className="input" />
          </label>
          <label className="block">
            <span className="label">Email this facility&apos;s requests to</span>
            <input name="notifyEmails" defaultValue={f.notifyEmails ?? ""} placeholder="e.g. housekeeping@tamarind.co.ke" className="input" />
            <span className="hint">
              The team that handles it. Leave empty to use {property.requestsEmail ? property.requestsEmail : "the property's request email (not set yet)"}.
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublished" defaultChecked={f.isPublished} className="h-4 w-4 accent-brand" />
            Show to guests
          </label>
        </div>
        <div className="sm:col-span-2">
          <SubmitButton>Save</SubmitButton>
        </div>
      </form>

      <h2 id="services" className="mb-2 mt-8 font-serif text-2xl">
        Services
      </h2>
      <p className="mb-3 text-sm text-stone-500">
        What guests can ask for here, e.g. towels, cleaning, a dental kit, or a spa treatment with its prices. Requests arrive in <Link href="/admin/requests" className="text-brand underline">Requests</Link>{" "}
        when they&apos;re switched on for {property.name}
        {property.requestsEnabled ? " (they are)." : " (they're off: switch them on in the property's Details)."}
      </p>
      <div className="space-y-2">
        {services.map((s) => (
          <form key={s.id} action={saveService} className="panel p-4">
            <input type="hidden" name="facilityId" value={f.id} />
            <input type="hidden" name="id" value={s.id} />
            <ServiceFields s={s} propertyId={f.propertyId} />
            <div className="mt-3 flex flex-wrap justify-end gap-1">
              <SubmitButton className="btn btn-sm" name="intent" value="up">
                ↑
              </SubmitButton>
              <SubmitButton className="btn btn-sm" name="intent" value="down">
                ↓
              </SubmitButton>
              <SubmitButton className="btn-danger btn-sm" name="intent" value="delete" confirm={`Remove ${s.name}?`}>
                Remove
              </SubmitButton>
              <SubmitButton className="btn-primary btn-sm" name="intent" value="save">
                Save
              </SubmitButton>
            </div>
          </form>
        ))}
        <form action={saveService} className="panel border-dashed p-4">
          <input type="hidden" name="facilityId" value={f.id} />
          <ServiceFields propertyId={f.propertyId} />
          <div className="mt-3 flex justify-end">
            <SubmitButton className="btn-primary btn-sm">Add service</SubmitButton>
          </div>
        </form>
      </div>

      <HoursEditor hours={hours} action={saveFacilityHours} ownerField="facilityId" ownerId={f.id} placeholder="e.g. Pool" />

      <form action={deleteFacility} className="mt-10 rounded-xl border border-red-200 bg-white p-5">
        <h2 className="font-semibold text-red-800">Delete {f.name}</h2>
        <p className="mt-1 text-sm text-stone-600">
          Deletes it with its hours and services. Past guest requests stay in Requests. To hide it instead, untick “Show to guests”.
        </p>
        <input type="hidden" name="id" value={f.id} />
        <div className="mt-3 flex flex-wrap gap-2">
          <input name="confirmName" placeholder={`Type "${f.name}" to confirm`} className="input max-w-xs" />
          <SubmitButton className="btn-danger">Delete</SubmitButton>
        </div>
      </form>
    </div>
  );
}
