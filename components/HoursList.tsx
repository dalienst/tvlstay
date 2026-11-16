import { formatDays, formatTime } from "@/lib/time";

type HoursLike = { id: number; label: string; days: number[]; opens: string; closes: string };

export function HoursList({ hours }: { hours: HoursLike[] }) {
  return (
    <dl className="divide-y divide-stone-100">
      {hours.map((h) => (
        <div key={h.id} className="flex items-baseline justify-between gap-4 py-2 text-sm">
          <dt className="text-stone-700">
            {h.label}
            {h.days.length > 0 && h.days.length < 7 && <span className="ml-1 text-stone-400">({formatDays(h.days)})</span>}
          </dt>
          <dd className="font-medium tabular-nums">
            {formatTime(h.opens)} – {formatTime(h.closes)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
