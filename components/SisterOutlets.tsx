import Image from "next/image";
import Link from "next/link";
import { getSisterOutlets } from "@/lib/compendium";
import { isExternal } from "@/lib/format";
import { Icon } from "./Icon";
import { OpenBadge } from "./OpenBadge";

/** Restaurants at the group's other live properties. Nothing shows until one is live. */
export async function SisterOutlets({ propertyId, className = "" }: { propertyId: number; className?: string }) {
  const outlets = await getSisterOutlets(propertyId);
  if (!outlets.length) return null;
  return (
    <section className={className}>
      <h2 className="px-1 font-serif text-2xl">Also from Tamarind</h2>
      <p className="mt-1 px-1 text-sm text-stone-600">Our sister restaurants nearby. Tap one for its hours and menus.</p>
      <ul className="mt-3 space-y-3">
        {outlets.map((o) => (
          <li key={o.id}>
            <Link href={`/${o.property.slug}/dining/${o.slug}`} className="card flex overflow-hidden hover:border-brand/40">
              {o.imageUrl && (
                <div className="relative w-28 shrink-0">
                  <Image src={o.imageUrl} unoptimized={isExternal(o.imageUrl)} alt="" fill sizes="112px" className="object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1 px-4 py-3.5">
                <h3 className="font-serif text-lg">{o.name}</h3>
                <p className="text-xs text-stone-500">
                  {o.property.name}
                  {o.location ? ` · ${o.location}` : ""}
                </p>
                {o.hours.length > 0 && (
                  <div className="mt-1.5">
                    <OpenBadge hours={o.hours} />
                  </div>
                )}
                <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand">
                  View menus <Icon name="right" className="h-4 w-4" />
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
