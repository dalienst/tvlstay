import { notFound, redirect } from "next/navigation";
import { getOutlet, getOutletMenus, getProperty } from "@/lib/compendium";
import { serviceStatus } from "@/lib/time";

// /village/dining/harbour opens the menu that fits the time of day: breakfast in the
// morning, the all day menu after 11. Falls back to the first menu.
export default async function OutletIndex({ params }: { params: Promise<{ property: string; outlet: string }> }) {
  const { property: slug, outlet: outletSlug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();
  const outlet = await getOutlet(property.id, outletSlug);
  if (!outlet) notFound();
  const menus = await getOutletMenus(outlet.id);
  if (!menus.length) redirect(`/${slug}/dining`);

  const status = serviceStatus(outlet.hours);
  const label = (status.open ? status.current.label : status.next?.label)?.toLowerCase() ?? "";
  const word = label.split(/\s+/)[0];
  const match = menus.find((m) => word && m.name.toLowerCase().includes(word)) ?? menus[0];
  redirect(`/${slug}/dining/${outlet.slug}/${match.slug}`);
}
