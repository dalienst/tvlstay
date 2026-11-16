import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/db";
import { rooms } from "@/lib/db/schema";
import { propertyFor } from "@/lib/admin/access";
import { first } from "@/lib/admin/form";
import { publicOrigin } from "@/lib/admin/qr";
import { Flash } from "@/components/admin/Flash";
import { PropertyTabs } from "@/components/admin/PropertyTabs";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { saveRooms } from "../../actions";

export const metadata = { title: "Rooms & QR codes" };

export default async function Rooms({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { property } = await propertyFor(Number((await params).id));
  const sp = await searchParams;
  const origin = await publicOrigin();
  const list = await getDb()
    .select()
    .from(rooms)
    .where(eq(rooms.propertyId, property.id))
    .orderBy(asc(rooms.label));
  list.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  return (
    <div className="max-w-3xl">
      <PropertyTabs property={property} active="/rooms" />
      <p className="mb-4 text-sm text-stone-500">
        The <b>general QR code</b> opens {origin}/{property.slug} and suits the lobby, tables and brochures. Each <b>room</b> gets its own code, so
        the guide knows which room a guest is in (for room service later).
      </p>
      <Flash msg={first(sp.msg)} err={first(sp.err)} />

      <div className="mb-6 flex flex-wrap gap-2">
        <a href={`/admin/properties/${property.id}/rooms/print`} target="_blank" className="btn-primary">
          Print QR codes
        </a>
        <a href={`/admin/properties/${property.id}/rooms/print?general=1`} target="_blank" className="btn">
          Print the general code only
        </a>
      </div>

      <form action={saveRooms} className="panel mb-6 p-4">
        <input type="hidden" name="propertyId" value={property.id} />
        <label className="block">
          <span className="label">Add rooms</span>
          <textarea name="labels" rows={2} placeholder="101, 102, 103 or a range like 201-212. Names work too: Penthouse A" className="input" />
        </label>
        <div className="mt-3">
          <SubmitButton>Add rooms</SubmitButton>
        </div>
      </form>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr>
              <th className="th">Room</th>
              <th className="th">QR link</th>
              <th className="th">Status</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className={r.isActive ? "" : "text-stone-400"}>
                <td className="td font-medium">{r.label}</td>
                <td className="td">
                  <a href={`/r/${r.code}`} target="_blank" className="break-all text-xs text-brand hover:underline">
                    {origin}/r/{r.code}
                  </a>
                </td>
                <td className="td">{r.isActive ? "On" : "Off"}</td>
                <td className="td">
                  <form action={saveRooms} className="flex flex-wrap justify-end gap-1">
                    <input type="hidden" name="propertyId" value={property.id} />
                    <input type="hidden" name="id" value={r.id} />
                    {r.isActive && (
                      <a href={`/admin/properties/${property.id}/rooms/print?room=${r.id}`} target="_blank" className="btn btn-sm">
                        QR code
                      </a>
                    )}
                    <SubmitButton className="btn btn-sm" name="intent" value="toggle">
                      {r.isActive ? "Switch off" : "Switch on"}
                    </SubmitButton>
                    <SubmitButton
                      className="btn btn-sm"
                      name="intent"
                      value="newcode"
                      confirm={`Give room ${r.label} a new QR code? The printed code will stop working until you replace it.`}
                    >
                      New code
                    </SubmitButton>
                    <SubmitButton className="btn-danger btn-sm" name="intent" value="delete" confirm={`Delete room ${r.label}?`}>
                      Delete
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td className="td text-stone-500" colSpan={4}>
                  No rooms yet. Add them above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
