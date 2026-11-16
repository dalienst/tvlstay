import { formatTime, serviceStatus } from "@/lib/time";

type HoursLike = { label: string; days: number[]; opens: string; closes: string };

export function OpenBadge({ hours }: { hours: HoursLike[] }) {
  if (!hours.length) return null;
  const s = serviceStatus(hours);
  if (s.open) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Open now · {s.current.label} until {formatTime(s.current.closes)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
      <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
      Closed{s.next ? ` · opens ${formatTime(s.next.opens)}` : ""}
    </span>
  );
}
