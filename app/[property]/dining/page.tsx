import Image from "next/image";
import { isExternal } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOutletMenus, getOutlets, getProperty } from "@/lib/compendium";
import { HoursList } from "@/components/HoursList";
import { OpenBadge } from "@/components/OpenBadge";
import { Icon } from "@/components/Icon";
import { SisterOutlets } from "@/components/SisterOutlets";

export const metadata = { title: "Dining" };

export default async function Dining({ params }: { params: Promise<{ property: string }> }) {
  const property = await getProperty((await params).property);
  if (!property) notFound();
  const outlets = await getOutlets(property.id);
  const withMenus = await Promise.all(outlets.map(async (o) => ({ ...o, menus: await getOutletMenus(o.id) })));

  return (
    <main className="px-4 pt-6">
      <p className="eyebrow px-1">Eat & drink</p>
      <h1 className="mt-1 px-1 font-serif text-3xl">Dining</h1>
      <ul className="mt-5 space-y-5">
        {withMenus.map((o) => (
          <li key={o.id} className="card overflow-hidden">
            {o.imageUrl && (
              <div className="relative aspect-[16/9]">
                <Image src={o.imageUrl} unoptimized={isExternal(o.imageUrl)} alt="" fill sizes="(max-width: 512px) 100vw, 512px" className="object-cover" />
              </div>
            )}
            <div className="px-4 py-4">
              <h2 className="font-serif text-2xl">{o.name}</h2>
              <div className="mt-2">
                <OpenBadge hours={o.hours} />
              </div>
              {o.description && <p className="mt-3 text-sm leading-relaxed text-stone-600">{o.description}</p>}
              {o.hours.length > 0 && (
                <div className="mt-3">
                  <HoursList hours={o.hours} />
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {o.menus.map((m) => (
                  <Link
                    key={m.id}
                    href={`/${property.slug}/dining/${o.slug}/${m.slug}`}
                    className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand-soft px-3.5 py-2 text-sm font-medium text-brand hover:bg-brand hover:text-white"
                  >
                    {m.name}
                    <Icon name="right" className="h-3.5 w-3.5" />
                  </Link>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <SisterOutlets propertyId={property.id} className="mt-8" />
    </main>
  );
}
