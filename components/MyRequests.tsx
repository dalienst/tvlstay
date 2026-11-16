import { getGuestRequests } from "@/lib/compendium";
import { GUEST_STATUS, myRequestIds } from "@/lib/guest-requests";

const time = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", weekday: "short", hour: "numeric", minute: "2-digit" }).format(d);

/** The requests this phone has sent, with their status. Nothing shows until the guest sends one. */
export async function MyRequests({ propertyId }: { propertyId: number }) {
  const rows = await getGuestRequests(propertyId, await myRequestIds());
  if (!rows.length) return null;
  return (
    <section className="card mt-6 px-4 py-4">
      <h2 className="font-serif text-xl">Your requests</h2>
      <ul className="mt-2 divide-y divide-stone-100">
        {rows.slice(0, 8).map((r) => {
          const s = GUEST_STATUS[r.status] ?? GUEST_STATUS.new;
          return (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="text-xs text-stone-500">
                  #{r.id} · {time(r.createdAt)}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>{s.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
