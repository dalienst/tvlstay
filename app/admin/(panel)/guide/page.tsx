import Link from "next/link";
import { requireUser } from "@/lib/auth/current";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/auth/roles";

export const metadata = { title: "Staff guide" };

// The staff guide: how the admin panel is organised and where to find things, for each role.
// Keep it in step with the screens: if a button or tab is renamed, rename it here too.

type Task = { q: string; a: React.ReactNode; roles: Role[] };

const ALL: Role[] = ["super_admin", "property_admin", "requests_team", "outlet_manager"];
const EDITORS: Role[] = ["super_admin", "property_admin", "outlet_manager"];
const HANDLERS: Role[] = ["super_admin", "property_admin", "requests_team"];
const ADMINS: Role[] = ["super_admin", "property_admin"];

const TASKS: Task[] = [
  {
    q: "Edit a restaurant or bar (an outlet)",
    roles: EDITORS,
    a: (
      <>
        Property admins: open the property, then click <b>Edit</b> next to the restaurant under <b>Dining</b> (or use the <b>Dining</b> tab).
        Outlet managers land on their outlet straight after signing in. There you change its name, description, photo, location, extension,
        hours and menus.
      </>
    ),
  },
  {
    q: "Change opening hours",
    roles: EDITORS,
    a: (
      <>
        On the outlet or facility page, scroll to <b>Opening hours</b>. Change the times and click <b>Save</b> on that row, or fill in the
        dashed row and click <b>Add hours</b>. Untick days it&apos;s closed. A closing time earlier than the opening time runs past
        midnight (use 24:00 for midnight).
      </>
    ),
  },
  {
    q: "Mark a dish sold out",
    roles: EDITORS,
    a: (
      <>
        Open the menu and click <b>Sold out</b> next to the item. Guests see it greyed out with “Not available today”. Click{" "}
        <b>Available again</b> when it&apos;s back.
      </>
    ),
  },
  {
    q: "Change a price or a dish",
    roles: EDITORS,
    a: (
      <>
        Open the menu, click <b>Edit</b> under the item, change it and <b>Save</b>. Prices: <code>1900</code> for one price,{" "}
        <code>Glass=1300; Bottle=5000</code> for several, <code>Bottle=5200 was 6500</code> to show a sale. Leave it empty to show no price.
      </>
    ),
  },
  {
    q: "Add a menu or a special",
    roles: EDITORS,
    a: (
      <>
        On the outlet page, under <b>Menus</b>, type a name and click <b>Create menu</b>. For a special, tick “It&apos;s a special” and set
        dates in <b>Menu settings</b>, so it appears and disappears on its own. New menus start hidden: tick “Show to guests” when ready.
      </>
    ),
  },
  {
    q: "Share a menu with another outlet",
    roles: ADMINS,
    a: (
      <>
        In the menu&apos;s <b>Menu settings</b>, tick the outlets that should also show it (this is how Harbour shows the beverage menu and wine
        list). It&apos;s edited only where it was created.
      </>
    ),
  },
  {
    q: "Add a pool, housekeeping, gym or other facility",
    roles: ADMINS,
    a: (
      <>
        Property → <b>Facilities</b> → type a name and click <b>Add</b>. Add a summary, photo and hours, then the <b>Services</b> guests can
        ask for (Towel service, Dental kit…). A service can have a photo and a price in KES: <code>5000</code>, or options like{" "}
        <code>60 min=5000; 90 min=7000</code> that guests choose from when they request it. Tick “Show to guests” and <b>Save</b>.
      </>
    ),
  },
  {
    q: "Handle guest requests",
    roles: HANDLERS,
    a: (
      <>
        Open <b>Requests</b> in the top menu (the red number is how many are new). It refreshes itself every 30 seconds. Use <b>Assigned to</b> to
        hand it to someone (they get an email). When someone is on it, set the status to <b>In progress</b> and click <b>Update</b>; set{" "}
        <b>Done</b> when it&apos;s sorted. The guest sees “On its way”
        and “Done” on their phone. The staff note is only for staff.
      </>
    ),
  },
  {
    q: "Decide who gets which requests",
    roles: ADMINS,
    a: (
      <>
        Each facility&apos;s page has <b>Email this facility&apos;s requests to</b>: put the team&apos;s address there (e.g. housekeeping for
        Housekeeping, the spa for Spa). Everything else goes to <b>Email requests to</b> in the property&apos;s Details, and reported
        problems to <b>Email reported problems to</b> (e.g. maintenance). Supervisors who should work through requests without editing the
        guide get a <b>Requests team</b> account (Staff).
      </>
    ),
  },
  {
    q: "Switch guest requests on or off",
    roles: ADMINS,
    a: (
      <>
        Property → <b>Details</b> → <b>Guest requests</b>. Only switch it on when someone at reception is watching the Requests page. When
        it&apos;s off, guests are told to dial reception instead.
      {" "}
        Only guests who scanned their apartment&apos;s QR code, or a spot code like the pool&apos;s, can send requests; anyone with just the
        link can browse but not ask. If a room&apos;s code is misused, click <b>New code</b> for that room under <b>Rooms &amp; QR codes</b>.
      </>
    ),
  },
  {
    q: "Change the welcome page, contacts or check-in times",
    roles: ADMINS,
    a: (
      <>
        Property → <b>Details</b>. Everything there (cover photo, welcome text, video, phone, extensions, Wi-Fi) is saved with{" "}
        <b>Save changes</b> at the bottom.
      </>
    ),
  },
  {
    q: "Change what's in the apartment, or guest info",
    roles: ADMINS,
    a: (
      <>
        Property → <b>In the apartment</b> (air conditioning, kitchenette…) or <b>Guest info</b> (check-out, Wi-Fi, room service…). Each row
        has an icon, a title and text.
      </>
    ),
  },
  {
    q: "Show another property's restaurants in this guide",
    roles: ADMINS,
    a: (
      <>
        Restaurants of every live property appear under <b>Also from Tamarind</b> in the other properties&apos; guides (for example Tamarind
        Restaurant in the Village guide). To leave a property out, untick “List its restaurants in the other Tamarind guides” in its{" "}
        <b>Details</b>.
      </>
    ),
  },
  {
    q: "Room QR codes",
    roles: ADMINS,
    a: (
      <>
        Property → <b>Rooms &amp; QR codes</b>. Add rooms (a range like 101-120 works), then <b>Print QR codes</b>. If a code is lost or
        copied, give that room a <b>New code</b> and reprint it. Room codes also fill in the room on guest requests.
      </>
    ),
  },
  {
    q: "Spot QR codes (pool loungers, the pool bar)",
    roles: EDITORS,
    a: (
      <>
        Open the facility (e.g. <b>Pools</b>) and scroll to <b>Spots and location QR codes</b>. Type a name like <i>Main pool</i> and click{" "}
        <b>Add spot</b>, then click <b>QR code</b> next to it (or <b>Print spot QR codes</b> for all of them) and print. A guest who scans it
        lands on that facility with the spot already chosen under “Where should we bring it?”, so a towel request says{" "}
        <b>Bring to: Main pool</b> in Requests and in the email. If a code goes missing, click <b>New code</b>: the old one stops working.
      </>
    ),
  },
  {
    q: "Change or remove a photo",
    roles: EDITORS,
    a: (
      <>
        Under any photo: <b>Upload photo</b>, <b>Choose from library</b>, or paste a link, then save the form. <b>Photos</b> in the top menu
        lists every upload; a photo can only be deleted once nothing uses it.
      </>
    ),
  },
  {
    q: "Hide something without deleting it",
    roles: EDITORS,
    a: <>Untick “Show to guests” and save. Tick it again later to bring it back.</>,
  },
  {
    q: "Forgot your password",
    roles: ALL,
    a: (
      <>
        On the sign-in page, click <b>Forgot password?</b> and enter your work email. You&apos;ll get a link that works once, for an hour.
        Choosing a new password signs you out everywhere else.
      </>
    ),
  },
  {
    q: "Add a staff member or reset a password",
    roles: ["super_admin"],
    a: (
      <>
        <b>Staff</b> → fill in <b>Add staff</b> with their role and the property or outlet they look after. A temporary password is shown
        once on screen: give it to them in person. They choose their own when they first sign in. Later, <b>Email reset link</b> sends
        them a link to choose a new password, <b>Reset password</b> shows a new temporary one, and <b>Deactivate</b> blocks the account.
      </>
    ),
  },
  {
    q: "Add a new property (e.g. GKC)",
    roles: ["super_admin"],
    a: (
      <>
        <b>Properties</b> → <b>Add a property</b>. It starts hidden. Fill in Details, add its outlets and facilities, then tick “Show to
        guests”.
      </>
    ),
  },
  {
    q: "See who changed what",
    roles: ["super_admin"],
    a: (
      <>
        <b>Activity</b> lists every sign-in and change with who made it and when.
      </>
    ),
  },
  {
    q: "Check what guests see",
    roles: EDITORS,
    a: <>Use the “View guest guide ↗” or “View as a guest ↗” links next to page titles. Changes show to guests straight away.</>,
  },
];

const ROLE_INTRO: Record<Role, { start: string; can: string[]; cannot: string }> = {
  super_admin: {
    start: "You start on Properties, which lists every property with quick links to its restaurants and facilities.",
    can: [
      "Everything a property admin can do, for every property",
      "Add properties, and change a property's web address",
      "Add staff, reset passwords, deactivate accounts (Staff)",
      "See the full history of changes (Activity)",
    ],
    cannot: "There's nothing you can't reach.",
  },
  property_admin: {
    start: "You start on your property's Details page. The tabs along the top lead to everything else.",
    can: [
      "Details: welcome page, photos, contacts, check-in times, the guest requests switch",
      "Dining: restaurants and bars, their hours and menus",
      "Facilities: pools, housekeeping and the services guests can request",
      "Requests: the guest requests inbox",
      "In the apartment, Guest info, Rooms & QR codes, Photos",
    ],
    cannot: "You can't see other properties or manage staff accounts. Ask a super admin for those.",
  },
  requests_team: {
    start: "You start on Requests, the list of guest requests and reported problems for your property.",
    can: [
      "See every request and problem for your property",
      "Assign a request to yourself or a colleague (they get an email)",
      "Set requests to In progress, Done or Cancelled, with a staff note",
      "Get emails for the requests that go to your team, once your address is on the facility or property",
    ],
    cannot: "You can't change the guide's content, menus, photos or staff accounts.",
  },
  outlet_manager: {
    start: "You start on your outlet's page (for example Harbour Restaurant).",
    can: ["Your outlet's details, photo and opening hours", "Its menus: sections, dishes, prices, sold out, specials", "Photos you upload"],
    cannot:
      "You can't change the property's pages, facilities, requests or other outlets, and you can't delete your outlet. Shared menus (like the wine list) are edited by the outlet that owns them.",
  },
};

export default async function Guide() {
  const user = await requireUser({ allowTemporaryPassword: true });
  const mine = user.role;
  const order: Role[] = [mine, ...ROLES.filter((r) => r !== mine)];
  const myTasks = TASKS.filter((t) => t.roles.includes(mine));

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl">Staff guide</h1>
      <p className="mt-1 text-stone-600">
        How the admin panel is organised and where to find things. You&apos;re signed in as <b>{ROLE_LABELS[mine]}</b>, so your part comes
        first.
      </p>

      <nav className="mt-4 flex flex-wrap gap-2 text-sm">
        {[
          ["#map", "How it's organised"],
          ["#menu", "The top menu"],
          ["#roles", "What each role does"],
          ["#tasks", "How do I…"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full border border-stone-200 bg-white px-3 py-1 hover:border-brand hover:text-brand">
            {label}
          </a>
        ))}
      </nav>

      <section id="map" className="mt-8 scroll-mt-4">
        <h2 className="font-serif text-2xl">How it&apos;s organised</h2>
        <p className="mt-2 text-sm text-stone-600">
          Everything belongs to a <b>property</b>: a whole unit with its own guest guide and QR codes, like Tamarind Village or Tamarind
          Mombasa. Inside a property:
        </p>
        <div className="panel mt-3 p-4 font-mono text-[13px] leading-relaxed text-stone-700">
          <p className="font-semibold text-ink">Property (Tamarind Village)</p>
          <p className="pl-4">
            ├ <b>Details</b> welcome page, photos, contacts, check-in, guest requests switch
          </p>
          <p className="pl-4">
            ├ <b>Dining</b> outlets: Harbour Restaurant…
          </p>
          <p className="pl-10">└ menus → sections → dishes and prices</p>
          <p className="pl-4">
            ├ <b>Facilities</b> Pools, Housekeeping…
          </p>
          <p className="pl-10">└ services guests can request: towels, dental kit…</p>
          <p className="pl-4">
            ├ <b>In the apartment</b> what every apartment has
          </p>
          <p className="pl-4">
            ├ <b>Guest info</b> check-out, Wi-Fi, room service…
          </p>
          <p className="pl-4">
            └ <b>Rooms &amp; QR codes</b> one code per room, printable
          </p>
        </div>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div className="panel p-3">
            <dt className="font-semibold">Property</dt>
            <dd className="mt-1 text-stone-600">A whole unit with its own guide. Tamarind Village, Tamarind Mombasa, later GKC.</dd>
          </div>
          <div className="panel p-3">
            <dt className="font-semibold">Outlet</dt>
            <dd className="mt-1 text-stone-600">A place with menus inside a property: a restaurant, bar or terrace. Guests find it under Dining.</dd>
          </div>
          <div className="panel p-3">
            <dt className="font-semibold">Facility</dt>
            <dd className="mt-1 text-stone-600">A service area like the pools or housekeeping, with services guests can request.</dd>
          </div>
        </dl>
      </section>

      <section id="menu" className="mt-8 scroll-mt-4">
        <h2 className="font-serif text-2xl">The top menu</h2>
        <ul className="panel mt-3 divide-y divide-stone-100 text-sm">
          {[
            ["Properties", "Your properties and their tabs. Outlet managers go straight to their outlet.", EDITORS],
            ["Requests", "Guest requests and reported problems, with a red count of new ones.", HANDLERS],
            ["Photos", "Every uploaded photo. Delete ones nothing uses.", EDITORS],
            ["Staff", "Staff accounts and passwords.", ["super_admin"]],
            ["Activity", "Who changed what, and when.", ["super_admin"]],
            ["Guide", "This page.", ALL],
            ["Your name (top right)", "Change your password.", ALL],
          ].map(([name, what, roles]) => (
            <li key={name as string} className="flex flex-wrap gap-x-3 px-4 py-2.5">
              <span className="w-40 shrink-0 font-semibold">{name as string}</span>
              <span className="min-w-0 flex-1 text-stone-600">{what as string}</span>
              <span className="text-xs text-stone-400">{(roles as Role[]).length === ROLES.length ? "Everyone" : (roles as Role[]).map((r) => ROLE_LABELS[r]).join(", ")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="roles" className="mt-8 scroll-mt-4">
        <h2 className="font-serif text-2xl">What each role does</h2>
        <div className="mt-3 space-y-3">
          {order.map((r) => (
            <details key={r} open={r === mine} className="panel group p-4">
              <summary className="cursor-pointer list-none font-semibold">
                <span className="mr-2 inline-block text-stone-400 transition group-open:rotate-90">›</span>
                {ROLE_LABELS[r]}
                {r === mine && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">You</span>}
              </summary>
              <p className="mt-3 text-sm text-stone-700">{ROLE_INTRO[r].start}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
                {ROLE_INTRO[r].can.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-stone-500">{ROLE_INTRO[r].cannot}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="tasks" className="mt-8 scroll-mt-4">
        <h2 className="font-serif text-2xl">How do I…</h2>
        <p className="mt-1 text-sm text-stone-500">The things you can do as {ROLE_LABELS[mine].toLowerCase()}.</p>
        <dl className="mt-3 space-y-3">
          {myTasks.map((t) => (
            <div key={t.q} className="panel p-4">
              <dt className="font-semibold">{t.q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-stone-600">{t.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-stone-500">
          Stuck? Ask a super admin. Nothing here sends emails or messages to guests.{" "}
          <Link href="/admin" className="text-brand underline">
            Back to the admin home
          </Link>
        </p>
      </section>
    </div>
  );
}
