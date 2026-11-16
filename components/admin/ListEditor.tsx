import { Icon, ICON_NAMES } from "@/components/Icon";
import { SubmitButton } from "./SubmitButton";
import { saveListItem } from "@/app/admin/(panel)/properties/actions";

type Row = { id: number; icon: string; title: string; text: string; isPublished: boolean };

export function IconSelect({ value }: { value: string }) {
  return (
    <select name="icon" defaultValue={value} className="input w-32" aria-label="Icon">
      {ICON_NAMES.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}

/** Edits a property's amenities or guest info: icon, title and text per row, plus order and visibility. */
export function ListEditor({ kind, propertyId, rows, textLabel }: { kind: "amenities" | "info"; propertyId: number; rows: Row[]; textLabel: string }) {
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <form key={r.id} action={saveListItem} className={`panel p-4 ${r.isPublished ? "" : "opacity-70"}`}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="propertyId" value={propertyId} />
          <input type="hidden" name="id" value={r.id} />
          <div className="flex flex-wrap items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
              <Icon name={r.icon} />
            </span>
            <IconSelect value={r.icon} />
            <input name="title" defaultValue={r.title} className="input min-w-48 flex-1" aria-label="Title" />
          </div>
          <textarea name="text" defaultValue={r.text} rows={kind === "info" ? 3 : 1} placeholder={textLabel} className="input mt-3" aria-label={textLabel} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="mr-auto flex items-center gap-2 text-sm">
              <input type="checkbox" name="isPublished" defaultChecked={r.isPublished} className="h-4 w-4 accent-brand" />
              Show to guests
            </label>
            <SubmitButton className="btn btn-sm" name="intent" value="up">
              ↑
            </SubmitButton>
            <SubmitButton className="btn btn-sm" name="intent" value="down">
              ↓
            </SubmitButton>
            <SubmitButton className="btn-danger btn-sm" name="intent" value="delete" confirm={`Delete "${r.title}"?`}>
              Delete
            </SubmitButton>
            <SubmitButton className="btn-primary btn-sm" name="intent" value="save">
              Save
            </SubmitButton>
          </div>
        </form>
      ))}

      <form action={saveListItem} className="panel border-dashed p-4">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="propertyId" value={propertyId} />
        <h2 className="mb-3 text-sm font-semibold">Add {kind === "amenities" ? "an amenity" : "an item"}</h2>
        <div className="flex flex-wrap gap-3">
          <IconSelect value={kind === "amenities" ? "check" : "info"} />
          <input name="title" placeholder="Title" required className="input min-w-48 flex-1" />
        </div>
        <textarea name="text" rows={kind === "info" ? 3 : 1} placeholder={textLabel} className="input mt-3" />
        <div className="mt-3">
          <SubmitButton>Add</SubmitButton>
        </div>
      </form>
    </div>
  );
}
