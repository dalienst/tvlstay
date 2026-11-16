import Link from "next/link";

const TABS = [
  ["", "Details"],
  ["/outlets", "Dining"],
  ["/facilities", "Facilities"],
  ["/amenities", "In the apartment"],
  ["/info", "Guest info"],
  ["/rooms", "Rooms & QR codes"],
] as const;

export function PropertyTabs({ property, active }: { property: { id: number; name: string; slug: string; isPublished: boolean }; active: string }) {
  return (
    <div className="mb-6">
      <p className="text-sm text-stone-500">
        <Link href="/admin" className="hover:underline">
          Properties
        </Link>{" "}
        /
      </p>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="font-serif text-3xl">{property.name}</h1>
        <a href={`/${property.slug}`} target="_blank" className="text-sm text-brand hover:underline">
          View guest guide ↗
        </a>
        {!property.isPublished && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Hidden from guests</span>
        )}
      </div>
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-stone-200">
        {TABS.map(([suffix, label]) => (
          <Link
            key={suffix}
            href={`/admin/properties/${property.id}${suffix}`}
            className={`shrink-0 border-b-2 px-3 pb-2 text-sm font-medium ${
              active === suffix ? "border-brand text-brand" : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
