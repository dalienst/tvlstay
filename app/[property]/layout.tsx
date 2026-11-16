import Image from "next/image";
import { isExternal } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProperty } from "@/lib/compendium";
import { currentRoom } from "@/lib/room";
import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";

export default async function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ property: string }>;
}) {
  const { property: slug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();
  const room = await currentRoom(property.id);

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-sand pb-24 shadow-[0_0_40px_rgba(0,0,0,0.04)]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200/70 bg-sand/95 px-4 py-2.5 backdrop-blur">
        <Link href={`/${property.slug}`} className="flex items-center gap-2.5">
          {property.logoUrl ? (
            <Image src={property.logoUrl} unoptimized={isExternal(property.logoUrl)} alt="" width={44} height={33} className="h-8 w-auto" />
          ) : null}
          <span className="font-serif text-lg leading-none">{property.name}</span>
        </Link>
        {room && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            <Icon name="key" className="h-3.5 w-3.5" />
            Room {room.label}
          </span>
        )}
      </header>
      {children}
      <BottomNav base={`/${property.slug}`} />
    </div>
  );
}
