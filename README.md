# Tamarind guest guide (tvlstay)

A paperless, QR-based in-room compendium for the Tamarind Group. Guests scan a QR code and
get the property's welcome page, dining with live opening hours, searchable menus,
facilities (pools, housekeeping) and guest information on their phone, and can request
services (towels, a dental kit) or report a problem (Wi-Fi) without a call.

It's built for the whole group from day one: properties (Tamarind Village, Tamarind Mombasa,
GKC, the Dhow, Nairobi units) → outlets (restaurants, bars, terraces) → menus → sections →
items, plus facilities (pools, housekeeping) → services that guests can request. Phase 1 switches on Tamarind Village and the Harbour restaurant. Tamarind Mombasa is
already loaded but hidden (it owns the beverage menu and wine list, which Harbour shares).

Stack: Next.js 16, Drizzle ORM, Postgres (Neon for testing), Tailwind 4. Hosted on Railway (app and database).

## Run it locally

Needs Node 22.

```bash
npm install
# .env.local needs DATABASE_URL (your Neon connection string). See .env.example.
npm run db:migrate     # creates the tables
npm run db:seed        # loads Tamarind Village, Harbour and the menus (only on an empty database)
npm run create-user -- --email you@tamarind.co.ke --name "Your Name"   # first super admin
npm run dev            # guest guide at http://localhost:3000, admin at /admin
```

`.env.local` also needs `SESSION_SECRET` (see `.env.example`) for staff sign-in.

`npm run db:seed -- --reset` wipes all guide content and loads the starting content again.
Use it only while testing: once the admin panel is in use it would erase staff edits.

## Deploying (Railway)

`railway.json` tells Railway how to run it: build with `npm run build`, run
`npm run db:migrate` as the **pre-deploy command**, then start with `npm start`. So database
changes apply themselves on every deploy, after the new version builds and before it goes
live. Migrations already applied are skipped, and if one fails the deploy stops and the
running site stays as it was.

As a safety net, `npm start` also runs the migrations before starting the site, so they
apply even if Railway skips the pre-deploy step. The second run finds nothing to do. If a
migration fails there, the site won't start: check the deploy logs for "Migration failed".

In the Railway project, add a Postgres service and set these variables on the app service:

* `DATABASE_URL`: reference the Postgres service, e.g. `${{Postgres.DATABASE_URL}}` (the
  private `*.railway.internal` address; SSL is switched off for it automatically)
* `SESSION_SECRET`, `APP_URL` (the public address, e.g. https://stay.tamarind.co.ke), and
  `DEFAULT_PROPERTY` if wanted

Then once, from your computer against the Railway database's public URL:
`npm run db:seed` (first load only) and `npm run create-user` for the first super admin.

If you add a staging environment in Railway, give it its own Postgres, since every deploy
runs migrations against the `DATABASE_URL` it's given.

## Email (Resend)

Email is for staff only: alerts about guest requests and "Forgot password" links. Guests are
never emailed. Set `RESEND_API_KEY` and `EMAIL_FROM` (an address on a domain verified in
Resend) and `APP_URL` (links in emails use it). Without them, email is simply skipped.

Who gets which request:

* a facility's request goes to **Email this facility's requests to** on that facility
  (e.g. housekeeping@), otherwise to the property's **Email requests to** (e.g. reception@)
* a reported problem (Wi-Fi, AC…) goes to the property's **Email reported problems to**
  (e.g. maintenance@), otherwise to **Email requests to**
* assigning a request to someone in Requests emails that person

The **Requests team** role is for supervisors who handle one property's requests without
editing the guide.

## QR codes

* **General code:** points at `/` (or `/village`). Good for the lobby, restaurant tables, brochures.
* **Room codes:** each room gets an unguessable link, `/r/<code>`. Scanning it remembers the
  room (the header shows "Room 101"), which room service and requests will use later.

Add rooms in the admin: open the property, **Rooms & QR codes**, type `101, 102` or a range
like `201-212`, then click **QR code** next to a room (or **Print QR codes** for all of them).
Set `APP_URL` to the live address before printing, otherwise the codes point at localhost.
(`npm run rooms` still works from the command line, but you don't need it.)

The starting content (`scripts/seed.ts`, `scripts/data/`) stays on your computer: it's in
`.gitignore`, and nothing in the deployed app needs it.

* **Spot codes:** places inside a facility where staff bring things (Main pool, Pool bar).
  Add them on the facility's admin page under **Spots and location QR codes**, then click
  **QR code** to print. Each points at `/s/<code>`; scanning it opens the facility with that
  spot chosen under "Where should we bring it?" (remembered for 6 hours). Guests can also pick
  "My room" or "Somewhere else" (with a note). Requests and staff emails show **Bring to**.

## Admin panel (/admin)

Staff sign in at `/admin`. Roles:

* **Super admin:** everything, including staff accounts and the activity log.
* **Property admin:** one property: details, welcome page, amenities, guest info, rooms and
  QR codes, photos, and all its outlets and menus.
* **Outlet manager:** one restaurant or bar: its details, hours and menus, including
  "Sold out" for the day.

New staff get a temporary password shown once on screen (no emails are sent) and choose their
own at first sign-in. Once email is set up, staff can also use **Forgot password?** on the sign-in
page, and a super admin can **Email reset link** from Staff. Changing a password signs out
every other session.

**Facilities and requests.** Facilities (Pools, Housekeeping, Gym…) have their own pages with
details, hours and services. When a property's "Guest requests" switch is on (Details), guests
can request a service or report a problem from the guide, with their room filled in from the
room QR code. Requests land in **Requests** (`/admin/requests`) for super admins and that
property's admins, who move them through New → In progress → Done; the guest sees the status on
their phone. Staff can get email alerts (see Email below); guests are never emailed. Each phone can send at most 10 requests an hour.
This is the base for the Phase 4 concierge (room service orders, notifications to staff).

Photos are uploaded straight into Postgres (resized to 2000px WebP, a few hundred KB each), so
they work the same locally and once deployed with no extra storage service. Any photo field also
accepts a pasted https link. A photo can't be deleted while it's in use. There's a staff guide, by role,
at `/admin/guide`.

## Starting content

The first load of menus comes from the text files in `scripts/data/` (`npm run db:seed`).
After that, edit everything in the admin panel. Each line is `Item name | price | description | tags`:

```
# All Day Menu | Served 11am to 10pm
## Starters
Butternut Soup | 950 | Creamy squash soup...
Goan Curry | Chicken=2100; Fish=2400 | Rich curry...
Vila Nova Vinho Verde | Bottle=5200 was 6500 | Portugal, 2023
```

The admin's price box uses the same format: `1900`, `Glass=1300; Bottle=5000`, or
`Bottle=5200 was 6500` for a sale. Empty means no price shown.

## Where things are

| Path | What |
| --- | --- |
| `lib/db/schema.ts` | The data model |
| `lib/compendium.ts` | Read-only queries for guest pages (only published content) |
| `lib/time.ts` | Opening hours and "open now", always in Nairobi time |
| `app/[property]/` | Guest pages: home, dining, menus, facilities, report a problem, info |
| `app/[property]/request-actions.ts` | Guest requests (checks, rate limit) |
| `app/r/[code]/` | Per-room QR code landing |
| `app/admin/` | Admin panel; `lib/admin/access.ts` checks who may edit what |
| `app/media/[id]/` | Serves uploaded photos |
| `scripts/` | Migrations, seed data, room QR codes |

## Roadmap

1. **Guest guide for the Village**
2. **Admin panel** (this): roles, editing for everything, photos, specials with dates,
   "sold out today", printable QR sheets
3. **More units:** Tamarind Mombasa with Dawa Terrace and specials, GKC, the Dhow, Nairobi
4. **Concierge:** builds on facilities and requests: room service orders, staff alerts,
   pre-arrival welcome messages

Scripts in this project never email or message guests.
