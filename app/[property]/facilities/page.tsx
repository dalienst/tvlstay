import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAmenities, getFacilities, getProperty } from "@/lib/compendium";
import { isExternal } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { MyRequests } from "@/components/MyRequests";
import { OpenBadge } from "@/components/OpenBadge";

export const metadata = { title: "Facilities" };

export default async function Facilities({ params }: { params: Promise<{ property: string }> }) {
  const property = await getProperty((await params).property);
  if (!property) notFound();
  const [list, facilities] = await Promise.all([getAmenities(property.id), getFacilities(property.id)]);
  const base = `/${property.slug}`;

  return (
    <main className="px-4 pt-6">
      <p className="eyebrow px-1">Fully serviced</p>
      <h1 className="mt-1 px-1 font-serif text-3xl">Facilities</h1>
      <p className="mt-2 px-1 text-sm leading-relaxed text-stone-600">
        Everything that comes with your stay{property.requestsEnabled ? ", and what you can ask us for from right here." : "."}
      </p>
      {property.gallery.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4">
          {property.gallery.map((src) => (
            <div key={src} className="relative aspect-[4/3] w-64 shrink-0 overflow-hidden rounded-2xl">
              <Image src={src} unoptimized={isExternal(src)} alt="" fill sizes="256px" className="object-cover" />
            </div>
          ))}
        </div>
      )}

      <MyRequests propertyId={property.id} />

      {facilities.length > 0 && (
        <ul className="mt-6 space-y-3">
          {facilities.map((f) => {
            const requestable = property.requestsEnabled && f.services.some((s) => s.isRequestable);
            return (
              <li key={f.id}>
                <Link href={`${base}/facilities/${f.slug}`} className="card flex overflow-hidden hover:border-brand/40">
                  {f.imageUrl ? (
                    <div className="relative w-28 shrink-0">
                      <Image src={f.imageUrl} unoptimized={isExternal(f.imageUrl)} alt="" fill sizes="112px" className="object-cover" />
                    </div>
                  ) : (
                    <span className="grid w-20 shrink-0 place-items-center bg-brand-soft text-brand">
                      <Icon name={f.icon} className="h-7 w-7" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1 px-4 py-3.5">
                    <h2 className="font-serif text-lg">{f.name}</h2>
                    {f.hours.length > 0 && (
                      <div className="mt-1">
                        <OpenBadge hours={f.hours} />
                      </div>
                    )}
                    {f.summary && <p className="mt-1.5 text-sm leading-snug text-stone-600">{f.summary}</p>}
                    {f.services.length > 0 && (
                      <p className="mt-1.5 text-xs text-stone-500">{f.services.map((s) => s.name).join(" · ")}</p>
                    )}
                    <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand">
                      {requestable ? "Details & requests" : "Details"} <Icon name="right" className="h-4 w-4" />
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {property.requestsEnabled && (
        <Link href={`${base}/report`} className="card mt-3 flex items-center gap-3.5 px-4 py-3.5 hover:border-brand/40">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <Icon name="alert" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-medium">Report a problem</h2>
            <p className="text-sm text-stone-600">Wi-Fi, TV, air conditioning, anything not working.</p>
          </div>
          <Icon name="right" className="h-5 w-5 text-stone-400" />
        </Link>
      )}

      {list.length > 0 && (
        <>
          <h2 className="mt-8 px-1 font-serif text-2xl">In your apartment</h2>
          <ul className="mt-3 grid grid-cols-1 gap-3">
            {list.map((a) => (
              <li key={a.id} className="card flex items-start gap-3.5 px-4 py-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon name={a.icon} />
                </span>
                <div>
                  <h3 className="font-medium">{a.title}</h3>
                  {a.description && <p className="text-sm text-stone-600">{a.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
