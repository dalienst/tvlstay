import { formatDays, formatTime } from "@/lib/time";
import { SubmitButton } from "./SubmitButton";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Hours = { id: number; label: string; opens: string; closes: string; days: number[] };

function DayChecks({ days }: { days: number[] }) {
  const all = days.length === 0;
  return (
    <div className="flex flex-wrap gap-1">
      {DAYS.map((d, i) => (
        <label key={d} className="flex items-center gap-1 rounded-md border border-stone-200 px-1.5 py-1 text-xs">
          <input type="checkbox" name="days" value={i} defaultChecked={all || days.includes(i)} className="accent-brand" />
          {d}
        </label>
      ))}
    </div>
  );
}

/** Opening hours rows for an outlet or a facility. `ownerField` is the hidden field the action reads. */
export function HoursEditor({
  hours,
  action,
  ownerField,
  ownerId,
  placeholder = "e.g. Lunch",
}: {
  hours: Hours[];
  action: (form: FormData) => Promise<void>;
  ownerField: "outletId" | "facilityId";
  ownerId: number;
  placeholder?: string;
}) {
  return (
    <>
      <h2 id="hours" className="mb-2 mt-8 font-serif text-2xl">
        Opening hours
      </h2>
      <p className="mb-3 text-sm text-stone-500">
        Times are Nairobi time. A closing time earlier than the opening time runs past midnight. Guests see “Open now” from these.
      </p>
      <div className="space-y-2">
        {hours.map((h) => (
          <form key={h.id} action={action} className="panel flex flex-wrap items-end gap-3 p-3">
            <input type="hidden" name={ownerField} value={ownerId} />
            <input type="hidden" name="id" value={h.id} />
            <label>
              <span className="label">Name</span>
              <input name="label" defaultValue={h.label} className="input w-40" />
            </label>
            <label>
              <span className="label">Opens</span>
              <input name="opens" type="time" defaultValue={h.opens} className="input w-28" />
            </label>
            <label>
              <span className="label">Closes</span>
              <input name="closes" type="text" defaultValue={h.closes} pattern="([01]\d|2[0-4]):[0-5]\d" className="input w-24" />
            </label>
            <DayChecks days={h.days} />
            <div className="ml-auto flex gap-1">
              <SubmitButton className="btn btn-sm" name="intent" value="up">
                ↑
              </SubmitButton>
              <SubmitButton className="btn btn-sm" name="intent" value="down">
                ↓
              </SubmitButton>
              <SubmitButton className="btn-danger btn-sm" name="intent" value="delete" confirm={`Remove ${h.label} hours?`}>
                Remove
              </SubmitButton>
              <SubmitButton className="btn-primary btn-sm" name="intent" value="save">
                Save
              </SubmitButton>
            </div>
            <p className="w-full text-xs text-stone-500">
              Guests see: {h.label}, {formatDays(h.days)}, {formatTime(h.opens)} – {formatTime(h.closes)}
            </p>
          </form>
        ))}
        <form action={action} className="panel flex flex-wrap items-end gap-3 border-dashed p-3">
          <input type="hidden" name={ownerField} value={ownerId} />
          <label>
            <span className="label">Name</span>
            <input name="label" placeholder={placeholder} required className="input w-40" />
          </label>
          <label>
            <span className="label">Opens</span>
            <input name="opens" type="time" required className="input w-28" />
          </label>
          <label>
            <span className="label">Closes</span>
            <input name="closes" type="text" placeholder="22:00" required pattern="([01]\d|2[0-4]):[0-5]\d" className="input w-24" />
          </label>
          <DayChecks days={[]} />
          <SubmitButton className="btn-primary btn-sm ml-auto">Add hours</SubmitButton>
        </form>
      </div>
    </>
  );
}
