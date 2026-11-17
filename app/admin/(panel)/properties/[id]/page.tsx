import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { facilities, outlets } from "@/lib/db/schema";
import { propertyFor } from "@/lib/admin/access";
import { kindLabel } from "@/lib/admin/kinds";
import { Icon } from "@/components/Icon";
import { emailConfigured } from "@/lib/email";
import { first } from "@/lib/admin/form";
import { Flash } from "@/components/admin/Flash";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { GalleryField, ImageField } from "@/components/admin/ImageField";
import { PropertyTabs } from "@/components/admin/PropertyTabs";
import { deleteProperty, updateProperty } from "../actions";
import { EVENT_BRANDS } from "@/lib/events";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function Text({ name, label, value, hint, type = "text", placeholder }: { name: string; label: string; value?: string | null; hint?: string; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input name={name} type={type} defaultValue={value ?? ""} placeholder={placeholder} className="input" />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

function Area({ name, label, value, rows = 4, hint }: { name: string; label: string; value?: string | null; rows?: number; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea name={name} rows={rows} defaultValue={value ?? ""} className="input" />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Overview({
  title,
  help,
  all,
  rows,
  addLabel,
}: {
  title: string;
  help: string;
  all: string;
  rows: { id: number; name: string; sub?: string; icon?: string; href: string; hidden: boolean }[];
  addLabel: string;
}) {
  return (
    <section className="panel p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <Link href={all} className="text-sm text-brand hover:underline">
          {rows.length ? "Manage all" : addLabel}
        </Link>
      </div>
      <p className="mt-0.5 text-xs text-stone-500">{help}</p>
      <ul className="mt-3 divide-y divide-stone-100">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 py-2">
            {r.icon && <Icon name={r.icon} className="h-4 w-4 text-brand" />}
            <Link href={r.href} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-brand">
              {r.name}
              {r.sub && <span className="ml-2 text-xs font-normal text-stone-500">{r.sub}</span>}
              {r.hidden && <span className="ml-2 text-xs font-semibold text-amber-800">Hidden</span>}
            </Link>
            <Link href={r.href} className="btn btn-sm">
              Edit
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="py-2 text-sm text-stone-500">None yet.</li>}
      </ul>
    </section>
  );
}

export default async function PropertyDetails({ params, searchParams }: Props) {
  const { user, property: p } = await propertyFor(Number((await params).id));
  const sp = await searchParams;
  const isSuper = user.role === "super_admin";
  const db = getDb();
  const [outletRows, facilityRows] = await Promise.all([
    db.select().from(outlets).where(eq(outlets.propertyId, p.id)).orderBy(asc(outlets.sortOrder), asc(outlets.id)),
    db.select().from(facilities).where(eq(facilities.propertyId, p.id)).orderBy(asc(facilities.sortOrder), asc(facilities.id)),
  ]);

  return (
    <div>
      <PropertyTabs property={p} active="" />
      <Flash msg={first(sp.msg)} err={first(sp.err)} />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Overview
          title="Dining"
          help="Restaurants and bars, with their menus and hours."
          all={`/admin/properties/${p.id}/outlets`}
          rows={outletRows.map((o) => ({ id: o.id, name: o.name, sub: kindLabel(o.kind), href: `/admin/outlets/${o.id}`, hidden: !o.isPublished }))}
          addLabel="Add a restaurant or bar"
        />
        <Overview
          title="Facilities"
          help="Pools, housekeeping and other services guests can request."
          all={`/admin/properties/${p.id}/facilities`}
          rows={facilityRows.map((f) => ({ id: f.id, name: f.name, icon: f.icon, href: `/admin/facilities/${f.id}`, hidden: !f.isPublished }))}
          addLabel="Add a facility"
        />
      </div>

      <form action={updateProperty} className="space-y-5">
        <input type="hidden" name="id" value={p.id} />

        <Section title="Basics">
          <Text name="name" label="Name" value={p.name} />
          <label className="block">
            <span className="label">Type</span>
            <select name="kind" defaultValue={p.kind} className="input">
              <option value="apartments">Apartments</option>
              <option value="hotel">Hotel</option>
              <option value="restaurant">Restaurant</option>
              <option value="casino">Casino</option>
              <option value="dhow">Dhow</option>
            </select>
          </label>
          {isSuper ? (
            <Text name="slug" label="Web address" value={p.slug} hint={`Guests open /${p.slug}. Changing it breaks QR codes already printed for the general guide.`} />
          ) : (
            <div>
              <span className="label">Web address</span>
              <p className="text-sm">/{p.slug}</p>
            </div>
          )}
          <Text name="city" label="City" value={p.city} />
          <div className="sm:col-span-2">
            <Text name="tagline" label="Tagline" value={p.tagline} hint="One line under the name on the welcome page." />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="isPublished" defaultChecked={p.isPublished} className="h-4 w-4 accent-brand" />
            Show to guests
          </label>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="showInOtherGuides" defaultChecked={p.showInOtherGuides} className="mt-0.5 h-4 w-4 accent-brand" />
            <span>
              List its restaurants in the other Tamarind guides
              <span className="hint">Shown under “Also from Tamarind” on the other properties&apos; home and Dining pages, while this property is shown to guests.</span>
            </span>
          </label>
          <label className="block sm:col-span-2">
            <span className="label">What&apos;s on: events from the website</span>
            <select name="eventsBrand" defaultValue={p.eventsBrand ?? ""} className="input">
              <option value="">Don&apos;t show events</option>
              {EVENT_BRANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            <span className="hint">
              Events are added on the Tamarind website (Admin → Events). The ones for this unit appear under “What&apos;s on” on the
              welcome page, and guests tap through to the website for details and tickets.
            </span>
          </label>
          {isSuper && <Text name="sortOrder" type="number" label="Position in lists" value={String(p.sortOrder)} />}
        </Section>

        <Section title="Welcome page">
          <div className="sm:col-span-2">
            <Area name="welcome" label="Welcome message" value={p.welcome} />
          </div>
          <div className="sm:col-span-2">
            <Area name="about" label="About the property" value={p.about} rows={6} hint="Longer text shown further down the welcome page. Leave empty to hide. Blank lines start a new paragraph." />
          </div>
          <ImageField name="heroImageUrl" label="Cover photo" defaultValue={p.heroImageUrl} propertyId={p.id} hint="Wide photos work best." />
          <ImageField name="logoUrl" label="Logo" defaultValue={p.logoUrl} propertyId={p.id} />
          <div className="sm:col-span-2">
            <GalleryField name="gallery" label="Photo gallery (shown on the Facilities page)" defaultValue={p.gallery} propertyId={p.id} />
          </div>
          <Text name="videoUrl" label="Video" value={p.videoUrl} placeholder="https://www.youtube.com/watch?v=…" hint="A YouTube or Vimeo link, or a link to an .mp4 file. Leave empty to hide." />
        </Section>

        <Section title="Your stay">
          <Text name="checkIn" type="time" label="Check-in from" value={p.checkIn} />
          <Text name="checkOut" type="time" label="Check-out by" value={p.checkOut} />
          <Text name="wifiName" label="Wi-Fi network" value={p.wifiName} hint="Leave empty to show “Given at check-in”." />
          <Text name="wifiPassword" label="Wi-Fi password" value={p.wifiPassword} hint="Anyone with the guide link can see this." />
          <Text name="receptionExt" label="Reception extension" value={p.receptionExt} />
          <Text name="roomServiceExt" label="Room service extension" value={p.roomServiceExt} />
        </Section>

        <Section title="Guest requests">
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="requestsEnabled" defaultChecked={p.requestsEnabled} className="mt-0.5 h-4 w-4 accent-brand" />
            <span>
              Let guests send requests and report problems from the guide
              <span className="hint">
                Guests can ask for a facility&apos;s services (towels, cleaning…) or report a problem such as the Wi-Fi. Requests arrive in{" "}
                <Link href="/admin/requests" className="text-brand underline">Requests</Link>. Only switch this on once reception is watching that page.
              </span>
            </span>
          </label>
          <Text
            name="requestsEmail"
            label="Email requests to"
            value={p.requestsEmail}
            placeholder="reception@tamarind.co.ke"
            hint="Staff emails alerted about each request. A facility can have its own team (e.g. housekeeping) on its page. Separate several with commas."
          />
          <Text
            name="issuesEmail"
            label="Email reported problems to"
            value={p.issuesEmail}
            placeholder="maintenance@tamarind.co.ke"
            hint="Wi-Fi, TV, air conditioning… Leave empty to use the address above."
          />
          {!emailConfigured() && (
            <p className="text-xs text-amber-800 sm:col-span-2">
              Email isn&apos;t switched on yet (RESEND_API_KEY and EMAIL_FROM), so requests only appear in Requests for now.
            </p>
          )}
        </Section>

        <Section title="Contact">
          <Text name="phone" label="Phone" value={p.phone} placeholder="+254 7…" />
          <Text name="whatsapp" label="WhatsApp number" value={p.whatsapp} placeholder="+2547…" />
          <Text name="email" type="email" label="Email" value={p.email} />
          <Text name="address" label="Address" value={p.address} />
          <Text name="reviewUrl" label="Review link (TripAdvisor, Google)" value={p.reviewUrl} />
        </Section>

        <div className="sticky bottom-0 -mx-4 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur">
          <SubmitButton>Save changes</SubmitButton>
        </div>
      </form>

      {isSuper && (
        <form action={deleteProperty} className="mt-10 rounded-xl border border-red-200 bg-white p-5">
          <h2 className="font-semibold text-red-800">Delete property</h2>
          <p className="mt-1 text-sm text-stone-600">
            Deletes {p.name} with all its outlets, menus, facilities, guest requests, amenities, info and rooms. This can&apos;t be undone. To hide it from guests instead, untick
            “Show to guests”.
          </p>
          <input type="hidden" name="id" value={p.id} />
          <div className="mt-3 flex flex-wrap gap-2">
            <input name="confirmName" placeholder={`Type "${p.name}" to confirm`} className="input max-w-xs" />
            <SubmitButton className="btn-danger">Delete property</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
