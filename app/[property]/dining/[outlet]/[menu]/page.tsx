import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMenuSections, getOutlet, getOutletMenus, getProperty } from "@/lib/compendium";
import { MenuView } from "@/components/MenuView";
import { OpenBadge } from "@/components/OpenBadge";
import { Icon } from "@/components/Icon";

type Props = { params: Promise<{ property: string; outlet: string; menu: string }> };

async function load(params: Props["params"]) {
  const { property: slug, outlet: outletSlug, menu: menuSlug } = await params;
  const property = await getProperty(slug);
  if (!property) return null;
  const outlet = await getOutlet(property.id, outletSlug);
  if (!outlet) return null;
  const menus = await getOutletMenus(outlet.id);
  const menu = menus.find((m) => m.slug === menuSlug);
  if (!menu) return null;
  return { property, outlet, menus, menu };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  return { title: data ? `${data.menu.name} · ${data.outlet.name}` : "Menu" };
}

export default async function MenuPage({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { property, outlet, menus, menu } = data;
  const sections = await getMenuSections(menu.id);
  const base = `/${property.slug}/dining/${outlet.slug}`;

  return (
    <main>
      <div className="px-4 pt-5">
        <Link href={`/${property.slug}/dining`} className="inline-flex items-center gap-1 text-sm text-stone-500">
          <Icon name="left" className="h-4 w-4" /> Dining
        </Link>
        <h1 className="mt-2 font-serif text-3xl">{outlet.name}</h1>
        <div className="mt-2">
          <OpenBadge hours={outlet.hours} />
        </div>
        {menus.length > 1 && (
          <nav aria-label="Menus" className="no-scrollbar -mx-4 mt-4 flex gap-1 overflow-x-auto border-b border-stone-200 px-4">
            {menus.map((m) => (
              <Link
                key={m.id}
                href={`${base}/${m.slug}`}
                aria-current={m.id === menu.id ? "page" : undefined}
                className={`shrink-0 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium ${
                  m.id === menu.id ? "border-brand text-brand" : "border-transparent text-stone-500"
                }`}
              >
                {m.name}
              </Link>
            ))}
          </nav>
        )}
        {(menu.servedNote || menu.description) && (
          <p className="mt-3 text-sm text-stone-600">{menu.servedNote ?? menu.description}</p>
        )}
      </div>

      <MenuView
        key={menu.id}
        currency={menu.currency}
        sections={sections.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          items: s.items.map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            prices: i.prices,
            priceNote: i.priceNote,
            tags: i.tags,
            imageUrl: i.imageUrl,
            isAvailable: i.isAvailable,
          })),
        }))}
      />

      <p className="px-5 pt-8 text-xs text-stone-500">
        Prices are in Kenya shillings. Please let your server know about any allergies.
        {property.roomServiceExt && <> For room service, dial {property.roomServiceExt}.</>}
      </p>
      {menu.footnote && <p className="px-5 pt-2 text-xs text-stone-500">{menu.footnote}</p>}
    </main>
  );
}
