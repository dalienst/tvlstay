import { getEvents, websiteUrl } from "@/lib/events";
import { Icon } from "./Icon";

/** "What's on": upcoming events for this unit, from the Tamarind website. Tapping one opens it there (details and tickets). */
export async function WhatsOn({ brand, className = "" }: { brand: string | null; className?: string }) {
  const events = await getEvents(brand);
  if (!events.length) return null;
  return (
    <section className={className}>
      <div className="flex items-baseline justify-between px-1">
        <h2 className="font-serif text-2xl">What&apos;s on</h2>
        <a href={`${websiteUrl()}/events`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand">
          All events
        </a>
      </div>
      <ul className="mt-3 space-y-3">
        {events.map((e) => (
          <li key={e.id}>
            <a href={e.url} target="_blank" rel="noopener noreferrer" className="card flex overflow-hidden hover:border-brand/40">
              {e.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.image} alt="" loading="lazy" className="w-28 shrink-0 object-cover" />
              )}
              <div className="min-w-0 flex-1 px-4 py-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">{e.when}</p>
                <h3 className="mt-0.5 font-serif text-lg leading-snug">{e.title}</h3>
                <p className="mt-1 text-sm text-stone-600">
                  {[e.time, e.venue, e.price].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand">
                  Details &amp; tickets <Icon name="right" className="h-4 w-4" />
                </p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
