import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/current";
import { canSeeRequests } from "@/lib/admin/requests";
import { pushConfigured, pushToUsers } from "@/lib/push";

// Turn phone alerts on or off for this device (Your account → Alerts on this phone).
//   POST   { subscription, scope: "all" | "mine", device }   turn on / change
//   DELETE { endpoint }                                       turn off
//   PUT                                                        send a test alert to my devices

async function staff() {
  const user = await getCurrentUser();
  return user && canSeeRequests(user) ? user : null;
}

export async function POST(req: NextRequest) {
  const user = await staff();
  if (!user) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!pushConfigured()) return NextResponse.json({ error: "Phone alerts aren't set up on the server yet (VAPID keys)." }, { status: 503 });
  const body = (await req.json().catch(() => null)) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    scope?: string;
    device?: string;
  } | null;
  const s = body?.subscription;
  if (!s?.endpoint || !/^https:\/\//.test(s.endpoint) || !s.keys?.p256dh || !s.keys?.auth) {
    return NextResponse.json({ error: "That browser didn't give a valid subscription." }, { status: 400 });
  }
  const values = {
    userId: user.id,
    endpoint: s.endpoint.slice(0, 1000),
    p256dh: s.keys.p256dh.slice(0, 200),
    auth: s.keys.auth.slice(0, 100),
    scope: body?.scope === "mine" ? "mine" : "all",
    device: body?.device?.slice(0, 80) || null,
  };
  // The same phone signing in as someone else takes the subscription over.
  await getDb()
    .insert(pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: values.userId, p256dh: values.p256dh, auth: values.auth, scope: values.scope, device: values.device } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) {
    await getDb().delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, body.endpoint), eq(pushSubscriptions.userId, user.id)));
  }
  return NextResponse.json({ ok: true });
}

export async function PUT() {
  const user = await staff();
  if (!user) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const { sent } = await pushToUsers([user.id], {
    title: "Test alert",
    body: "Phone alerts are working. New guest requests will show up like this.",
    url: "/admin/requests",
    tag: "test",
  });
  return NextResponse.json({ ok: true, sent });
}
