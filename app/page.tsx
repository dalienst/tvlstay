import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { listProperties } from "@/lib/compendium";

// The general QR code points here. With DEFAULT_PROPERTY set (e.g. "village"), guests go
// straight to that property's guide; otherwise they pick from the published properties.
export default async function Home() {
  await connection();
  const fallback = process.env.DEFAULT_PROPERTY;
  if (fallback) redirect(`/${fallback}`);
  const list = await listProperties();
  if (list.length === 1) redirect(`/${list[0].slug}`);

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <Image src="/logos/tamgrouplogo.png" alt="The Tamarind Group" width={180} height={117} className="mx-auto" priority />
      <h1 className="mt-6 text-center font-serif text-3xl">Welcome</h1>
      <p className="mt-2 text-center text-stone-600">Where are you staying or dining?</p>
      <ul className="mt-8 space-y-3">
        {list.map((p) => (
          <li key={p.id}>
            <Link href={`/${p.slug}`} className="card block px-5 py-4 hover:border-brand">
              <span className="font-serif text-xl">{p.name}</span>
              {p.tagline && <span className="mt-1 block text-sm text-stone-600">{p.tagline}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
