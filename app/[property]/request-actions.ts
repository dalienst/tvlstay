"use server";

// Guests asking for a service (towels, cleaning...) or reporting a problem.
// No sign-in: the room comes from the room's QR code, or the guest types it.
// Guests get no emails or messages. Staff see requests in the admin panel and, when email is
// set up, the right team gets an alert (lib/notify.ts).
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { notifyNewRequest } from "@/lib/notify";
import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { facilities, facilityServices, guestRequests, spots } from "@/lib/db/schema";
import { getProperty } from "@/lib/compendium";
import { currentRoom } from "@/lib/room";
import { MAX_REQUESTS_PER_HOUR, REQUESTS_COOKIE, myRequestIds } from "@/lib/guest-requests";
import { optionText, shownPrices } from "@/lib/price";

export type RequestState = { ok?: boolean; id?: number; error?: string } | null;

const clip = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max) || null;

export async function sendRequest(_prev: RequestState, form: FormData): Promise<RequestState> {
  const property = await getProperty(String(form.get("property") ?? ""));
  if (!property || !property.requestsEnabled) return { error: "Requests aren't available here. Please call reception." };
  const db = getDb();

  const kind = form.get("kind") === "issue" ? "issue" : "service";
  const message = clip(form.get("message"), 1000);
  let title = "Problem reported";
  let facilityId: number | null = null;
  let serviceId: number | null = null;
  let option: string | null = null;
  let deliverTo: string | null = null;
  let spotId: number | null = null;

  if (kind === "service") {
    const id = Number(form.get("serviceId"));
    const [row] = await db
      .select({ service: facilityServices, facility: facilities })
      .from(facilityServices)
      .innerJoin(facilities, eq(facilities.id, facilityServices.facilityId))
      .where(
        and(
          eq(facilityServices.id, Number.isInteger(id) ? id : -1),
          eq(facilities.propertyId, property.id),
          eq(facilities.isPublished, true),
          eq(facilityServices.isPublished, true),
          eq(facilityServices.isRequestable, true),
        ),
      );
    if (!row) return { error: "That service isn't available right now. Please call reception." };
    title = `${row.service.name} (${row.facility.name})`;
    // Priced options: the guest must pick one of the current ones. One price is recorded as is.
    const choices = shownPrices(row.service.prices).map(optionText);
    if (choices.length > 1) {
      option = String(form.get("option") ?? "");
      if (!choices.includes(option)) return { error: "Please choose an option." };
    } else if (choices.length === 1) option = choices[0];
    facilityId = row.facility.id;
    serviceId = row.service.id;
  } else {
    const topic = clip(form.get("topic"), 60);
    if (topic) title = topic;
    if (!message) return { error: "Tell us briefly what's wrong." };
  }

  const room = await currentRoom(property.id);
  const roomLabel = room?.label ?? clip(form.get("room"), 30);
  if (!roomLabel) return { error: "Please add your room or apartment number." };

  // Where to bring it: the room, one of this facility's spots (e.g. Main pool), or elsewhere.
  if (kind === "service") {
    const where = String(form.get("deliverTo") ?? "room");
    if (where.startsWith("spot:")) {
      const [spot] = await db
        .select()
        .from(spots)
        .where(and(eq(spots.id, Number(where.slice(5)) || -1), eq(spots.facilityId, facilityId!), eq(spots.isActive, true)));
      if (!spot) return { error: "Please choose where we should bring it." };
      deliverTo = spot.name;
      spotId = spot.id;
    } else if (where === "other") {
      if (!message) return { error: "Tell us where to bring it in the box below." };
      deliverTo = "Somewhere else (see message)";
    } else {
      deliverTo = `Room ${roomLabel}`;
    }
  }

  // Basic flood protection: a hashed IP, never stored in plain form.
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const sourceHash = createHash("sha256").update(`${ip}|${process.env.SESSION_SECRET ?? "tvlstay"}`).digest("hex").slice(0, 32);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(guestRequests)
    .where(and(eq(guestRequests.sourceHash, sourceHash), gt(guestRequests.createdAt, new Date(Date.now() - 60 * 60 * 1000))));
  if (n >= MAX_REQUESTS_PER_HOUR) return { error: "You've sent a lot of requests in the last hour. Please call reception instead." };

  const [saved] = await db
    .insert(guestRequests)
    .values({
      propertyId: property.id,
      kind,
      facilityId,
      serviceId,
      title,
      option,
      message,
      roomId: room?.id ?? null,
      roomLabel,
      deliverTo,
      spotId,
      guestName: clip(form.get("name"), 80),
      contact: clip(form.get("contact"), 40),
      sourceHash,
    })
    .returning({ id: guestRequests.id });

  // Email the right team once the guest has their answer (skipped if email isn't set up).
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = host ? `${h.get("x-forwarded-proto") ?? "http"}://${host}` : undefined;
  after(() => notifyNewRequest(saved.id, origin).catch((err) => console.error("[notify] request", saved.id, err)));

  const ids = [...(await myRequestIds()), saved.id].slice(-20);
  (await cookies()).set(REQUESTS_COOKIE, ids.join("."), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { ok: true, id: saved.id };
}
