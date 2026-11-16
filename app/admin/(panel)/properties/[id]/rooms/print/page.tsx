import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { rooms } from "@/lib/db/schema";
import { propertyFor } from "@/lib/admin/access";
import { publicOrigin, qrSvg } from "@/lib/admin/qr";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "Print QR codes" };

function Card({ title, sub, svg, logo }: { title: string; sub: string; svg: string; logo: string | null }) {
  return (
    <div className="flex break-inside-avoid flex-col items-center rounded-2xl border border-stone-300 bg-white p-5 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {logo && <img src={logo} alt="" className="mb-2 h-12 w-auto" />}
      <p className="font-serif text-lg leading-tight">{title}</p>
      <div className="my-3 w-40" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="text-xs text-stone-600">{sub}</p>
    </div>
  );
}

export default async function PrintQr({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { property } = await propertyFor(Number((await params).id));
  const generalOnly = (await searchParams).general === "1";
  const origin = await publicOrigin();
  const list = generalOnly
    ? []
    : await getDb()
        .select()
        .from(rooms)
        .where(and(eq(rooms.propertyId, property.id), eq(rooms.isActive, true)))
        .orderBy(asc(rooms.label));
  list.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  const general = await qrSvg(`${origin}/${property.slug}`);
  const cards = await Promise.all(list.map(async (r) => ({ r, svg: await qrSvg(`${origin}/r/${r.code}`) })));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <PrintButton />
        <p className="text-sm text-stone-500">
          Codes point at <b>{origin}</b>.{" "}
          {origin.includes("localhost") && "That's this computer: set APP_URL to the live address before printing for real."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3">
        <Card title={property.name} sub="Scan for our guest guide: dining, menus and more" svg={general} logo={property.logoUrl} />
        {cards.map(({ r, svg }) => (
          <Card key={r.id} title={`Room ${r.label}`} sub="Scan for your in-room guide" svg={svg} logo={property.logoUrl} />
        ))}
      </div>
    </div>
  );
}
