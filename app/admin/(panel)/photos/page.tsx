import { desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { media, properties } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/current";
import { scopeFor } from "@/lib/admin/scope";
import { first } from "@/lib/admin/form";
import { Flash } from "@/components/admin/Flash";
import { CopyButton } from "@/components/admin/CopyButton";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { deletePhoto } from "./actions";

export const metadata = { title: "Photos" };

export default async function Photos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser({ roles: ["super_admin", "property_admin", "outlet_manager"] });
  const scope = await scopeFor(user);
  const sp = await searchParams;
  const db = getDb();
  const cols = { id: media.id, filename: media.filename, width: media.width, height: media.height, size: media.size, propertyId: media.propertyId, createdAt: media.createdAt };
  const list = scope.all
    ? await db.select(cols).from(media).orderBy(desc(media.id))
    : await db
        .select(cols)
        .from(media)
        .where(or(isNull(media.propertyId), eq(media.propertyId, scope.propertyId ?? -1)))
        .orderBy(desc(media.id));
  const props = scope.all ? await db.select({ id: properties.id, name: properties.name }).from(properties).orderBy(properties.sortOrder) : null;
  const propName = new Map((props ?? []).map((p) => [p.id, p.name]));

  return (
    <div>
      <h1 className="font-serif text-3xl">Photos</h1>
      <p className="mb-4 mt-1 text-sm text-stone-500">
        Upload photos here, or straight from any photo field. Use them for cover photos, outlets, facilities and dishes. A photo can&apos;t be
        deleted while it&apos;s in use.
      </p>
      <Flash msg={first(sp.msg)} err={first(sp.err)} />
      <PhotoUploader properties={props} />
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((m) => (
          <li key={m.id} className="panel overflow-hidden">
            <a href={`/media/${m.id}`} target="_blank">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/media/${m.id}`} alt={m.filename} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            </a>
            <div className="space-y-1 p-2 text-xs">
              <p className="truncate font-medium" title={m.filename}>
                {m.filename}
              </p>
              <p className="text-stone-500">
                {m.width}×{m.height} · {Math.round(m.size / 1024)} KB
                {scope.all && <> · {m.propertyId ? propName.get(m.propertyId) : "Whole group"}</>}
              </p>
              <div className="flex items-center justify-between">
                <CopyButton text={`/media/${m.id}`} />
                {(scope.all || m.propertyId === scope.propertyId) && (
                  <form action={deletePhoto}>
                    <input type="hidden" name="id" value={m.id} />
                    <SubmitButton className="text-xs text-red-700 underline" confirm="Delete this photo?">
                      Delete
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="mt-6 text-sm text-stone-500">No photos uploaded yet.</p>}
    </div>
  );
}
