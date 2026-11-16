import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { facilities, outlets } from "@/lib/db/schema";
import { accessibleProperties } from "@/lib/admin/access";
import { first } from "@/lib/admin/form";
import { Flash } from "@/components/admin/Flash";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createProperty } from "./properties/actions";

export const metadata = { title: "Properties" };

function QuickLinks({ label, rows, href }: { label: string; rows: { id: number; name: string }[]; href: (id: number) => string }) {
  if (!rows.length) return null;
  return (
    <p className="mt-3 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">{label}</span>{" "}
      {rows.map((r, i) => (
        <span key={r.id}>
          {i > 0 && <span className="text-stone-300"> · </span>}
          <Link href={href(r.id)} className="text-stone-700 underline decoration-stone-300 underline-offset-2 hover:text-brand">
            {r.name}
          </Link>
        </span>
      ))}
    </p>
  );
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  // Outlet managers and property admins go straight to the one thing they manage.
  if (user.role === "outlet_manager") redirect(user.outletId ? `/admin/outlets/${user.outletId}` : "/admin/account");
  if (user.role === "requests_team") redirect("/admin/requests");
  if (user.role === "property_admin") redirect(user.propertyId ? `/admin/properties/${user.propertyId}` : "/admin/account");
  const list = await accessibleProperties(user);
  const sp = await searchParams;
  const db = getDb();
  const [allOutlets, allFacilities] = await Promise.all([
    db.select({ id: outlets.id, name: outlets.name, propertyId: outlets.propertyId }).from(outlets).orderBy(asc(outlets.sortOrder), asc(outlets.id)),
    db
      .select({ id: facilities.id, name: facilities.name, propertyId: facilities.propertyId })
      .from(facilities)
      .orderBy(asc(facilities.sortOrder), asc(facilities.id)),
  ]);

  return (
    <div>
      <h1 className="font-serif text-3xl">Properties</h1>
      <p className="mb-5 mt-1 text-sm text-stone-500">Each property (Tamarind Village, Tamarind Mombasa…) has its own guest guide and room QR codes. Inside it are its outlets (restaurants and bars, with menus) and its facilities (pools, housekeeping).</p>
      <Flash msg={first(sp.msg)} err={first(sp.err)} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <li key={p.id} className="panel flex h-full flex-col p-4 hover:border-brand/50">
            <Link href={`/admin/properties/${p.id}`} className="block">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-serif text-xl">{p.name}</h2>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    p.isPublished ? "bg-emerald-50 text-emerald-800" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {p.isPublished ? "Live" : "Hidden"}
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-500">/{p.slug}</p>
              {p.tagline && <p className="mt-2 text-sm text-stone-600">{p.tagline}</p>}
            </Link>
            <QuickLinks label="Dining" rows={allOutlets.filter((o) => o.propertyId === p.id)} href={(id) => `/admin/outlets/${id}`} />
            <QuickLinks label="Facilities" rows={allFacilities.filter((f) => f.propertyId === p.id)} href={(id) => `/admin/facilities/${id}`} />
            <Link href={`/admin/properties/${p.id}`} className="mt-auto pt-3 text-sm font-medium text-brand">
              Open {p.name} →
            </Link>
          </li>
        ))}
      </ul>

      <form action={createProperty} className="panel mt-8 grid max-w-2xl gap-3 p-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <label>
          <span className="label">Add a property</span>
          <input name="name" placeholder="e.g. Golden Key Casino" required className="input" />
        </label>
        <label>
          <span className="label">Type</span>
          <select name="kind" className="input" defaultValue="hotel">
            <option value="apartments">Apartments</option>
            <option value="hotel">Hotel</option>
            <option value="restaurant">Restaurant</option>
            <option value="casino">Casino</option>
            <option value="dhow">Dhow</option>
          </select>
        </label>
        <SubmitButton>Add</SubmitButton>
      </form>
    </div>
  );
}
