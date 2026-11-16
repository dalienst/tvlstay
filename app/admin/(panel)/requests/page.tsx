import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { REQUEST_STATUSES, guestRequests, properties, users, type RequestStatus } from "@/lib/db/schema";
import { canHandleRequests, isRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/current";
import { first } from "@/lib/admin/form";
import { STATUS_LABELS, canSeeRequests, requestScope } from "@/lib/admin/requests";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { Flash } from "@/components/admin/Flash";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { updateRequest } from "./actions";

export const metadata = { title: "Requests" };

const when = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);

function ago(d: Date) {
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

const BADGE: Record<RequestStatus, string> = {
  new: "bg-brand text-white",
  in_progress: "bg-amber-100 text-amber-900",
  done: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-stone-100 text-stone-600",
};

export default async function Requests({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (!canSeeRequests(user)) redirect("/admin");
  const sp = await searchParams;
  const view = first(sp.status);
  const status: RequestStatus | "open" | "all" | "mine" =
    view === "all" || view === "mine" || (REQUEST_STATUSES as readonly string[]).includes(view ?? "") ? (view as RequestStatus | "all" | "mine") : "open";
  const db = getDb();
  const scope = requestScope(user);

  const counts = await db
    .select({ status: guestRequests.status, n: sql<number>`count(*)::int` })
    .from(guestRequests)
    .where(scope)
    .groupBy(guestRequests.status);
  const count = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  const open = sql`${guestRequests.status} in ('new', 'in_progress')`;
  const filter =
    status === "all"
      ? undefined
      : status === "open"
        ? open
        : status === "mine"
          ? and(open, eq(guestRequests.assignedTo, user.id))
          : eq(guestRequests.status, status);
  const rows = await db
    .select({ r: guestRequests, property: properties.name })
    .from(guestRequests)
    .innerJoin(properties, eq(properties.id, guestRequests.propertyId))
    .where(and(scope, filter))
    // Open requests oldest first, so the longest wait is on top; finished ones newest first.
    .orderBy(status === "open" || status === "mine" || status === "new" || status === "in_progress" ? asc(guestRequests.createdAt) : desc(guestRequests.createdAt))
    .limit(200);
  const multi = user.role === "super_admin";
  // Staff who can take requests: super admins, plus each property's admins and requests team.
  const staff = (
    await db
      .select({ id: users.id, name: users.name, role: users.role, propertyId: users.propertyId, outletId: users.outletId })
      .from(users)
      .where(and(eq(users.active, true), inArray(users.role, ["super_admin", "property_admin", "requests_team"])))
      .orderBy(asc(users.name))
  ).filter((u) => isRole(u.role));
  const assignable = (propertyId: number) =>
    staff.filter((u) => isRole(u.role) && canHandleRequests({ role: u.role, propertyId: u.propertyId, outletId: u.outletId }, propertyId));
  const [{ mine }] = await db
    .select({ mine: sql<number>`count(*)::int` })
    .from(guestRequests)
    .where(and(scope, open, eq(guestRequests.assignedTo, user.id)));
  const here = `/admin/requests${status === "open" ? "" : `?status=${status}`}`;

  const tabs: [string, string, number | null][] = [
    ["open", "Open", count("new") + count("in_progress")],
    ["mine", "Assigned to me", mine],
    ["new", "New", count("new")],
    ["in_progress", "In progress", count("in_progress")],
    ["done", "Done", null],
    ["cancelled", "Cancelled", null],
    ["all", "All", null],
  ];

  return (
    <div className="max-w-4xl">
      <AutoRefresh seconds={30} />
      <h1 className="font-serif text-3xl">Guest requests</h1>
      <p className="mb-4 mt-1 text-sm text-stone-500">
        Requests and problems guests send from the guide. This page refreshes itself every 30 seconds. Assign a request to someone (they get
        an email), set it to “In progress” when someone is on it, and “Done” when it&apos;s sorted. Guests see the status on their phone.
      </p>
      <Flash msg={first(sp.msg)} err={first(sp.err)} />
      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-stone-200">
        {tabs.map(([key, label, n]) => (
          <Link
            key={key}
            href={key === "open" ? "/admin/requests" : `/admin/requests?status=${key}`}
            className={`shrink-0 border-b-2 px-3 pb-2 text-sm font-medium ${
              status === key ? "border-brand text-brand" : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {label}
            {n ? <span className="ml-1.5 rounded-full bg-stone-100 px-1.5 text-xs text-stone-700">{n}</span> : null}
          </Link>
        ))}
      </nav>

      <ul className="space-y-3">
        {rows.map(({ r, property }) => (
          <li key={r.id} id={`r${r.id}`} className="panel scroll-mt-4 p-4">
            <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE[r.status]}`}>{STATUS_LABELS[r.status]}</span>
              <h2 className="font-semibold">
                {r.kind === "issue" ? "Problem: " : ""}
                {r.title}
              </h2>
              <span className="ml-auto text-sm text-stone-500" title={when(r.createdAt)}>
                #{r.id} · {ago(r.createdAt)}
              </span>
            </div>
            {r.option && <p className="mt-1 text-sm font-medium text-brand">{r.option}</p>}
            {r.deliverTo && (
              <p className="mt-1 text-sm">
                Bring to: <b>{r.deliverTo}</b>
              </p>
            )}
            <p className="mt-1 text-sm">
              <b>{r.roomLabel ? `Room ${r.roomLabel}` : "Room not given"}</b>
              {r.guestName && <> · {r.guestName}</>}
              {r.contact && (
                <>
                  {" "}
                  · <a href={`tel:${r.contact.replace(/[^\d+]/g, "")}`} className="text-brand underline">{r.contact}</a>
                </>
              )}
              {multi && <span className="text-stone-500"> · {property}</span>}
            </p>
            {r.message && <p className="mt-2 whitespace-pre-line rounded-lg bg-stone-50 px-3 py-2 text-sm">{r.message}</p>}
            <form action={updateRequest} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="return" value={here} />
              <label>
                <span className="label">Status</span>
                <select name="status" defaultValue={r.status} className="input w-36">
                  {REQUEST_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Assigned to</span>
                <select name="assignedTo" defaultValue={r.assignedTo ?? ""} className="input w-56">
                  <option value="">Nobody yet</option>
                  {assignable(r.propertyId).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.id === user.id ? `Me (${u.name})` : u.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-48 flex-1">
                <span className="label">Staff note (only staff see this)</span>
                <input name="staffNote" defaultValue={r.staffNote ?? ""} placeholder="e.g. Sent Ali with towels" className="input" />
              </label>
              <SubmitButton className="btn-primary btn-sm">Update</SubmitButton>
            </form>
            {r.handledBy && (
              <p className="mt-2 text-xs text-stone-500">
                Last updated by {r.handledBy}, {when(r.updatedAt)}
              </p>
            )}
          </li>
        ))}
        {rows.length === 0 && (
          <li className="panel px-4 py-8 text-center text-sm text-stone-500">
            {status === "open" ? "No open requests. All caught up." : status === "mine" ? "Nothing assigned to you right now." : "Nothing here."}
          </li>
        )}
      </ul>
    </div>
  );
}
