import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { media } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/current";
import { audit } from "@/lib/audit";
import { saveUpload } from "@/lib/media";
import { scopeFor } from "@/lib/admin/scope";

/** Photo library for the picker: the user's property photos plus group-wide ones. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role === "requests_team") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!user) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  const scope = await scopeFor(user);
  const wanted = Number(req.nextUrl.searchParams.get("property")) || null;
  const db = getDb();
  const cols = { id: media.id, filename: media.filename, width: media.width, height: media.height, propertyId: media.propertyId };
  const rows =
    scope.all && !wanted
      ? await db.select(cols).from(media).orderBy(desc(media.id)).limit(300)
      : await db
          .select(cols)
          .from(media)
          .where(or(isNull(media.propertyId), eq(media.propertyId, (scope.all ? wanted : scope.propertyId) ?? -1)))
          .orderBy(desc(media.id))
          .limit(300);
  return NextResponse.json(rows.map((r) => ({ ...r, url: `/media/${r.id}` })));
}

/** Upload one or more photos (multipart field "file"). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role === "requests_team") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!user || user.mustChangePassword) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  const scope = await scopeFor(user);
  const form = await req.formData();
  const asked = Number(form.get("propertyId")) || null;
  // Staff tied to a property always upload into it; super admins choose (or leave group-wide).
  const propertyId = scope.all ? asked : scope.propertyId;
  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  try {
    const saved = [];
    for (const f of files) saved.push(await saveUpload(f, { propertyId, userId: user.id }));
    await audit(user, "media_uploaded", saved.map((s) => s.url).join(", "));
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
