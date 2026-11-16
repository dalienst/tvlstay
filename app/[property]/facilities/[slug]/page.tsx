import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFacility, getProperty } from "@/lib/compendium";
import { currentRoom } from "@/lib/room";
import { currentSpot } from "@/lib/spot";
import { isExternal, telHref } from "@/lib/format";
import { money, optionText, shownPrices } from "@/lib/price";
import { HoursList } from "@/components/HoursList";
import { Icon } from "@/components/Icon";
import { MyRequests } from "@/components/MyRequests";
import { OpenBadge } from "@/components/OpenBadge";
import { RequestForm } from "@/components/RequestForm";

type Props = { params: Promise<{ property: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { property: ps, slug } = await params;
  const p = await getProperty(ps);
  const f = p ? await getFacility(p.id, slug) : null;
  return { title: f?.name ?? "Not found" };
}

export default async function FacilityPage({ params }: Props) {
  const { property: ps, slug } = await params;
  const property = await getProperty(ps);
  if (!property) notFound();
  const f = await getFacility(property.id, slug);
  if (!f) notFound();
  const [room, scanned] = await Promise.all([currentRoom(property.id), currentSpot(property.id)]);
  const atSpot = scanned && scanned.facility.id === f.id ? scanned.spot : null;
  const ext = f.extension ?? property.receptionExt;

  return (
    <main>
      {f.imageUrl && (
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Image
            src={f.imageUrl}
            unoptimized={isExternal(f.imageUrl)}
            alt=""
            fill
            priority
            sizes="(max-width: 512px) 100vw, 512px"
            className="object-cover"
          />
        </div>
      )}
      <div className="px-4 pt-5">
        <Link
          href={`/${property.slug}/facilities`}
          className="inline-flex items-center gap-1 px-1 text-sm text-stone-500"
        >
          <Icon name="left" className="h-4 w-4" /> Facilities
        </Link>
        <div className="mt-2 flex items-center gap-3 px-1">
          {!f.imageUrl && (
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon name={f.icon} />
            </span>
          )}
          <h1 className="font-serif text-3xl">{f.name}</h1>
        </div>
        {f.hours.length > 0 && (
          <div className="mt-2 px-1">
            <OpenBadge hours={f.hours} />
          </div>
        )}
        {atSpot && (
          <p className="mx-1 mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            <Icon name="pin" className="h-3.5 w-3.5" /> You&apos;re at {atSpot.name}: we&apos;ll bring requests here
          </p>
        )}
        {f.summary && <p className="mt-3 px-1 text-stone-700">{f.summary}</p>}
        {f.details?.split(/\n\s*\n/).map((para, i) => (
          <p
            key={i}
            className="mt-3 whitespace-pre-line px-1 leading-relaxed text-stone-700"
          >
            {para}
          </p>
        ))}
        {(f.location || f.extension) && (
          <p className="mt-3 px-1 text-sm text-stone-500">
            {f.location}
            {f.location && f.extension && " · "}
            {f.extension && `Extension ${f.extension}`}
          </p>
        )}
        {f.hours.length > 0 && (
          <div className="card mt-4 px-4 py-3">
            <HoursList hours={f.hours} />
          </div>
        )}

        {f.services.length > 0 && (
          <section className="mt-6">
            <h2 className="px-1 font-serif text-2xl">Services</h2>
            <ul className="mt-3 space-y-3">
              {f.services.map((s) => {
                const prices = shownPrices(s.prices);
                const single =
                  prices.length === 1 && !prices[0].label ? prices[0] : null;
                return (
                  <li key={s.id} className="card overflow-hidden">
                    {s.imageUrl && (
                      <div className="relative aspect-[16/9]">
                        <Image
                          src={s.imageUrl}
                          unoptimized={isExternal(s.imageUrl)}
                          alt=""
                          fill
                          sizes="(max-width: 512px) 100vw, 512px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="px-4 py-3.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-medium">{s.name}</h3>
                        {single ? (
                          <span className="shrink-0 text-sm font-medium tabular-nums">
                            {single.was && (
                              <s className="mr-1.5 font-normal text-stone-400">
                                {money(single.was)}
                              </s>
                            )}
                            {money(single.amount!)}
                          </span>
                        ) : (
                          !prices.length &&
                          s.priceNote && (
                            <span className="shrink-0 text-sm text-stone-600">
                              {s.priceNote}
                            </span>
                          )
                        )}
                      </div>
                      {s.description && (
                        <p className="mt-0.5 text-sm text-stone-600">
                          {s.description}
                        </p>
                      )}
                      {prices.length > 0 && !single && (
                        <ul className="mt-2 divide-y divide-dashed divide-stone-200 text-sm">
                          {prices.map((p, i) => (
                            <li
                              key={i}
                              className="flex justify-between gap-3 py-1.5"
                            >
                              <span className="text-stone-700">
                                {p.label ?? s.name}
                              </span>
                              <span className="font-medium tabular-nums">
                                {p.was && (
                                  <s className="mr-1.5 font-normal text-stone-400">
                                    {money(p.was)}
                                  </s>
                                )}
                                {money(p.amount!)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {prices.length > 0 && s.priceNote && (
                        <p className="mt-1 text-xs text-stone-500">
                          {s.priceNote}
                        </p>
                      )}
                      {property.requestsEnabled && s.isRequestable && (
                        <details className="group mt-3">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white group-open:hidden">
                            <Icon name="send" className="h-4 w-4" /> Request
                          </summary>
                          <div className="mt-1">
                            <RequestForm
                              property={property.slug}
                              serviceId={s.id}
                              room={room?.label}
                              options={
                                prices.length > 1
                                  ? prices.map(optionText)
                                  : undefined
                              }
                              places={f.spots}
                              atSpot={atSpot?.id}
                              submitLabel={`Request ${s.name.toLowerCase()}`}
                            />
                          </div>
                        </details>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!property.requestsEnabled && f.services.length > 0 && ext && (
          <p className="mt-4 px-1 text-sm text-stone-600">
            To ask for any of these, dial <b>{ext}</b> from your room phone
            {property.phone && (
              <>
                {" "}
                or{" "}
                <a
                  href={telHref(property.phone)}
                  className="font-medium text-brand underline"
                >
                  call us
                </a>
              </>
            )}
            .
          </p>
        )}

        <MyRequests propertyId={property.id} />
      </div>
    </main>
  );
}
