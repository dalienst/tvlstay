import { notFound } from "next/navigation";
import { getInfo, getProperty } from "@/lib/compendium";
import { telHref, whatsappHref } from "@/lib/format";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Guest information" };

export default async function Info({ params }: { params: Promise<{ property: string }> }) {
  const property = await getProperty((await params).property);
  if (!property) notFound();
  const items = await getInfo(property.id);

  const contacts = [
    property.phone && { icon: "phone", label: property.phone, href: telHref(property.phone) },
    property.whatsapp && { icon: "chat", label: "WhatsApp us", href: whatsappHref(property.whatsapp) },
    property.email && { icon: "mail", label: property.email, href: `mailto:${property.email}` },
    property.address && {
      icon: "pin",
      label: property.address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.name}, ${property.address}`)}`,
    },
  ].filter(Boolean) as { icon: string; label: string; href: string }[];

  return (
    <main className="px-4 pt-6">
      <p className="eyebrow px-1">Your stay</p>
      <h1 className="mt-1 px-1 font-serif text-3xl">Guest information</h1>
      <ul className="mt-5 space-y-3">
        {items.map((i) => (
          <li key={i.id} className="card px-4 py-4">
            <h2 className="flex items-center gap-2 font-medium">
              <Icon name={i.icon} className="h-5 w-5 text-brand" />
              {i.title}
            </h2>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-stone-600">{i.body}</p>
          </li>
        ))}
      </ul>

      {property.reviewUrl && (
        <a href={property.reviewUrl} target="_blank" rel="noopener noreferrer" className="card mt-3 flex items-center gap-3 px-4 py-4 hover:border-brand/40">
          <Icon name="star" className="h-5 w-5 text-brand" />
          <span>
            <span className="block font-medium">Enjoyed your stay?</span>
            <span className="text-sm text-stone-600">We&apos;d love a review.</span>
          </span>
        </a>
      )}

      {contacts.length > 0 && (
        <section className="mt-8">
          <h2 className="px-1 font-serif text-2xl">Contact us</h2>
          <ul className="card mt-3 divide-y divide-stone-100">
            {contacts.map((c) => (
              <li key={c.href}>
                <a href={c.href} className="flex items-center gap-3 px-4 py-3.5 text-sm hover:text-brand">
                  <Icon name={c.icon} className="h-5 w-5 shrink-0 text-brand" />
                  <span className="min-w-0 break-words">{c.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-8 pb-2 text-center text-xs text-stone-400">Part of The Tamarind Group</p>
    </main>
  );
}
