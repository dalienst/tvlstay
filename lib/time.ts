// All hours are in Nairobi time (EAT, UTC+3, no daylight saving), whatever the server's time zone.
export const TIME_ZONE = "Africa/Nairobi";

type HoursLike = { label: string; days: number[]; opens: string; closes: string };

function nairobiParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    weekday,
  };
}

export function todayInNairobi() {
  return nairobiParts().date;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** "05:00" -> "5am", "22:30" -> "10:30pm", "12:00" -> "noon", "24:00" -> "midnight". */
export function formatTime(hhmm: string) {
  const mins = toMinutes(hhmm);
  if (mins === 12 * 60) return "noon";
  if (mins === 0 || mins === 24 * 60) return "midnight";
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function formatDays(days: number[]) {
  if (!days.length || days.length === 7) return "Daily";
  return days.map((d) => DAY_NAMES[d]).join(", ");
}

/** Which service is on now, and if none, which comes next today. Handles hours past midnight. */
export function serviceStatus(hours: HoursLike[], now = new Date()) {
  const { minutes, weekday } = nairobiParts(now);
  const yesterday = (weekday + 6) % 7;
  const appliesTo = (h: HoursLike, day: number) => !h.days.length || h.days.includes(day);

  for (const h of hours) {
    const open = toMinutes(h.opens);
    let close = toMinutes(h.closes);
    if (close <= open) close += 24 * 60; // runs past midnight
    if (appliesTo(h, weekday) && minutes >= open && minutes < close) return { open: true as const, current: h };
    // Started yesterday and still going after midnight.
    if (close > 24 * 60 && appliesTo(h, yesterday) && minutes + 24 * 60 < close) return { open: true as const, current: h };
  }
  const next = hours
    .filter((h) => appliesTo(h, weekday) && toMinutes(h.opens) > minutes)
    .sort((a, b) => toMinutes(a.opens) - toMinutes(b.opens))[0];
  return { open: false as const, next: next ?? null };
}
