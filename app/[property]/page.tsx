import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAmenities, getFacilities, getOutlets, getProperty } from "@/lib/compendium";
import { formatTime } from "@/lib/time";
import { isExternal, telHref, whatsappHref } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { OpenBadge } from "@/components/OpenBadge";
import { Video } from "@/components/Embeds";
import { SisterOutlets } from "@/components/SisterOutlets";

type Props = { params: Promise<{ property: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProperty((await params).property);
  return { title: p ? `Welcome to ${p.name}` : "Not found" };
}

export default async function PropertyHome({ params }: Props) {
  const property = await getProperty((await params).property);
  if (!property) notFound();
  const [outlets, facilityList, amenityList] = await Promise.all([getOutlets(property.id), getFacilities(property.id), getAmenities(property.id)]);
  const base = `/${property.slug}`;

  const facts = [
    property.checkIn && { icon: "door", label: "Check-in", value: `From ${formatTime(property.checkIn)}` },
    property.checkOut && { icon: "clock", label: "Check-out", value: `By ${formatTime(property.checkOut)}` },
    { icon: "wifi", label: "Wi-Fi", value: property.wifiName ?? "Given at check-in", sub: property.wifiPassword ?? undefined },
    property.roomServiceExt && { icon: "bell", label: "Room service", value: `Dial ${property.roomServiceExt}` },
  ].filter(Boolean) as { icon: string; label: string; value: string; sub?: string }[];

  return (
    <main>
      <section className="relative">
        {property.heroImageUrl && (
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <Image src={property.heroImageUrl} unoptimized={isExternal(property.heroImageUrl)} alt="" fill priority sizes="(max-width: 512px) 100vw, 512px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-6 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">Karibu · Welcome</p>
          <h1 className="mt-1 font-serif text-[2rem] leading-tight">{property.name}</h1>
          {property.tagline && <p className="mt-1 text-sm text-white/85">{property.tagline}</p>}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 px-4 pt-5">
        {facts.map((f) => (
          <div key={f.label} className="card px-4 py-3.5">
            <div className="flex items-center gap-2 text-brand">
              <Icon name={f.icon} className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">{f.label}</span>
            </div>
            <p className="mt-1.5 font-medium">{f.value}</p>
            {f.sub && <p className="text-sm text-stone-600">{f.sub}</p>}
          </div>
        ))}
      </section>

      {property.welcome && (
        <section className="px-5 pt-7">
          <p className="leading-relaxed text-stone-700">{property.welcome}</p>
        </section>
      )}

      {outlets.length > 0 && (
        <section className="pt-8">
          <div className="flex items-baseline justify-between px-5">
            <h2 className="font-serif text-2xl">Dining</h2>
            <Link href={`${base}/dining`} className="text-sm font-medium text-brand">
              All menus
            </Link>
          </div>
          <ul className="mt-3 space-y-3 px-4">
            {outlets.map((o) => (
              <li key={o.id}>
                <Link href={`${base}/dining/${o.slug}`} className="card flex overflow-hidden hover:border-brand/40">
                  {o.imageUrl && (
                    <div className="relative w-28 shrink-0">
                      <Image src={o.imageUrl} unoptimized={isExternal(o.imageUrl)} alt="" fill sizes="112px" className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 px-4 py-3.5">
                    <h3 className="font-serif text-lg">{o.name}</h3>
                    <div className="mt-1.5">
                      <OpenBadge hours={o.hours} />
                    </div>
                    <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand">
                      View menus <Icon name="right" className="h-4 w-4" />
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SisterOutlets propertyId={property.id} className="px-4 pt-8" />

      {facilityList.length > 0 && (
        <section className="pt-8">
          <div className="flex items-baseline justify-between px-5">
            <h2 className="font-serif text-2xl">Facilities</h2>
            <Link href={`${base}/facilities`} className="text-sm font-medium text-brand">
              See all
            </Link>
          </div>
          <ul className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
            {facilityList.map((f) => (
              <li key={f.id} className="shrink-0">
                <Link href={`${base}/facilities/${f.slug}`} className="card flex w-36 flex-col gap-2 px-3.5 py-3.5 hover:border-brand/40">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
                    <Icon name={f.icon} />
                  </span>
                  <span className="text-sm font-medium leading-snug">{f.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {amenityList.length > 0 && (
        <section className="pt-8">
          <div className="flex items-baseline justify-between px-5">
            <h2 className="font-serif text-2xl">In your apartment</h2>
            <Link href={`${base}/facilities`} className="text-sm font-medium text-brand">
              See all
            </Link>
          </div>
          <ul className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
            {amenityList.slice(0, 6).map((a) => (
              <li key={a.id} className="card flex w-36 shrink-0 flex-col gap-2 px-3.5 py-3.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Icon name={a.icon} />
                </span>
                <span className="text-sm leading-snug">{a.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {property.about && (
        <section className="px-5 pt-8">
          <h2 className="font-serif text-2xl">About {property.name}</h2>
          {property.about.split(/\n\s*\n/).map((para, i) => (
            <p key={i} className="mt-3 whitespace-pre-line leading-relaxed text-stone-700">
              {para}
            </p>
          ))}
        </section>
      )}

      {property.videoUrl && (
        <section className="px-4 pt-8">
          <Video url={property.videoUrl} title={`${property.name} video`} />
        </section>
      )}

      <section className="px-4 pt-8">
        <h2 className="px-1 font-serif text-2xl">Need anything?</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {property.phone && (
            <a href={telHref(property.phone)} className="card flex items-center gap-3 px-4 py-3.5 hover:border-brand/40">
              <Icon name="phone" className="h-5 w-5 text-brand" />
              <span className="text-sm font-medium">Call us</span>
            </a>
          )}
          {property.whatsapp && (
            <a href={whatsappHref(property.whatsapp)} className="card flex items-center gap-3 px-4 py-3.5 hover:border-brand/40">
              <Icon name="chat" className="h-5 w-5 text-brand" />
              <span className="text-sm font-medium">WhatsApp</span>
            </a>
          )}
        </div>
        {property.requestsEnabled && (
          <Link href={`${base}/report`} className="card mt-3 flex items-center gap-3 px-4 py-3.5 hover:border-brand/40">
            <Icon name="alert" className="h-5 w-5 text-brand" />
            <span className="flex-1 text-sm font-medium">Report a problem</span>
            <Icon name="right" className="h-4 w-4 text-stone-400" />
          </Link>
        )}
        {property.receptionExt && (
          <p className="mt-3 px-1 text-sm text-stone-500">From your room phone, dial reception on {property.receptionExt}.</p>
        )}
      </section>
    </main>
  );
}
