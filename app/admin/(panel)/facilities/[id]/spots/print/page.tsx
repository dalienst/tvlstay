import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { spots } from "@/lib/db/schema";
import { facilityFor } from "@/lib/admin/access";
import { publicOrigin, qrSvg } from "@/lib/admin/qr";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "Print spot QR codes" };

export default async function PrintSpots({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ spot?: string }>;
}) {
  const { facility, property } = await facilityFor(Number((await params).id));
  const only = Number((await searchParams).spot) || null;
  const origin = await publicOrigin();
  const list = await getDb()
    .select()
    .from(spots)
    .where(and(eq(spots.facilityId, facility.id), eq(spots.isActive, true), only ? eq(spots.id, only) : undefined))
    .orderBy(asc(spots.sortOrder), asc(spots.id));
  const cards = await Promise.all(list.map(async (s) => ({ s, svg: await qrSvg(`${origin}/s/${s.code}`) })));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <PrintButton />
        {only && (
          <a href={`/admin/facilities/${facility.id}/spots/print`} className="btn">
            All spots
          </a>
        )}
        <p className="text-sm text-stone-500">
          Codes point at <b>{origin}</b>.{" "}
          {origin.includes("localhost") && "That's this computer: set APP_URL to the live address before printing for real."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3">
        {cards.map(({ s, svg }) => (
          <div key={s.id} className="flex break-inside-avoid flex-col items-center rounded-2xl border border-stone-300 bg-white p-5 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {property.logoUrl && <img src={property.logoUrl} alt="" className="mb-2 h-12 w-auto" />}
            <p className="font-serif text-lg leading-tight">{s.name}</p>
            <div className="my-3 w-40" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="text-xs text-stone-600">Need something? Scan to ask, and we&apos;ll bring it to you here.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
