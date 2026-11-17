// "What's on" comes from the Tamarind website, which is where events are created (for every
// unit) and where guests buy tickets. The guide only reads the website's public events link:
//   GET {WEBSITE_URL}/api/events?brand=tamarind_village&upcoming=1
// It never touches the website's database. Results are cached for 5 minutes; if the website
// is slow or down, the section is simply left out.

export const EVENT_BRANDS = [
  { id: "tamarind_village", label: "Tamarind Village" },
  { id: "tamarind_restaurant", label: "Tamarind Mombasa Restaurant" },
  { id: "dawa_terrace", label: "Dawa Terrace" },
  { id: "tamarind_dhow", label: "Tamarind Dhow" },
  { id: "golden_key", label: "Golden Key Casino" },
];

export type GuideEvent = {
  id: string;
  title: string;
  description: string;
  venue: string;
  when: string;
  time: string | null;
  price: string | null;
  image: string | null;
  url: string;
  sortKey: string;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function websiteUrl() {
  return process.env.WEBSITE_URL?.replace(/\/+$/, "") || null;
}

type FeedEvent = {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  venue?: string;
  startDate?: string;
  endDate?: string | null;
  timeText?: string;
  repeatDays?: number[] | null;
  priceKes?: number | null;
  image?: string | null;
};

function repeatText(days: number[]) {
  if (days.length === 7) return "Every day";
  const names = days.map((d) => WEEKDAYS[d]);
  return `Every ${names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}` : names[0]}`;
}

function dateText(start: string, end?: string | null) {
  const f = (d: string, withYear = false) =>
    new Date(`${d}T12:00:00+03:00`).toLocaleDateString("en-GB", { weekday: withYear ? undefined : "short", day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
  return end && end !== start ? `${f(start)} to ${f(end)}` : f(start);
}

export function toGuideEvent(e: FeedEvent, site: string): GuideEvent | null {
  if (!e?.id || !e.title) return null;
  const days = Array.isArray(e.repeatDays) ? e.repeatDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort() : [];
  const start = /^\d{4}-\d{2}-\d{2}$/.test(e.startDate ?? "") ? e.startDate! : null;
  return {
    id: e.id,
    title: e.title,
    description: e.description ?? "",
    venue: e.venue ?? "",
    when: days.length ? repeatText(days) : start ? dateText(start, e.endDate) : "Coming soon",
    time: e.timeText || null,
    price: e.priceKes ? `KES ${e.priceKes.toLocaleString("en-KE")}` : null,
    image: e.image && /^https?:\/\//.test(e.image) ? e.image : e.image ? `${site}${e.image.startsWith("/") ? "" : "/"}${e.image}` : null,
    url: `${site}/events#${encodeURIComponent(e.slug || e.id)}`,
    // Weekly events first (they're on most days), then one-offs by date.
    sortKey: days.length ? `0-${days[0]}` : `1-${start ?? "9999"}`,
  };
}

export async function getEvents(brand: string | null | undefined, limit = 4): Promise<GuideEvent[]> {
  const site = websiteUrl();
  if (!site || !brand) return [];
  try {
    const res = await fetch(`${site}/api/events?brand=${encodeURIComponent(brand)}&upcoming=1`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: FeedEvent[] };
    return (data.events ?? [])
      .map((e) => toGuideEvent(e, site))
      .filter((e): e is GuideEvent => e !== null)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(0, limit);
  } catch {
    return [];
  }
}
