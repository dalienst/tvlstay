// Small helpers for reading FormData in server actions.
import { redirect } from "next/navigation";

export const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
/** Empty string becomes null, so optional fields are cleared rather than saved as "". */
export const opt = (f: FormData, k: string) => str(f, k) || null;
export const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
export const int = (f: FormData, k: string) => {
  const n = Number.parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : null;
};

/** "Harbour Restaurant" -> "harbour-restaurant" */
export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** "HH:MM" 24h, allowing 24:00 for midnight. */
export function isTime(s: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(s);
}

/** Redirect back to a page with a message banner. */
export function back(path: string, msg: string, kind: "ok" | "error" = "ok"): never {
  const [base, hash] = path.split("#");
  const sep = base.includes("?") ? "&" : "?";
  redirect(`${base}${sep}${kind === "ok" ? "msg" : "err"}=${encodeURIComponent(msg)}${hash ? `#${hash}` : ""}`);
}

export function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

/** Image fields accept an uploaded photo (/media/12), a file in /public, or a full https link. */
export function imageUrl(f: FormData, k: string): string | null {
  const v = str(f, k);
  if (!v) return null;
  if (v.startsWith("/") || /^https:\/\//i.test(v)) return v;
  if (/^http:\/\//i.test(v)) return v.replace(/^http:/i, "https:");
  return null;
}

/** A comma-separated list of staff emails. Empty becomes null; anything that isn't an email sends the user back. */
export function emails(f: FormData, k: string, path: string): string | null {
  const v = str(f, k);
  if (!v) return null;
  const list = v.split(/[,;\s]+/).filter(Boolean);
  const bad = list.find((e) => !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(e));
  if (bad) back(path, `"${bad}" isn't an email address. Separate several with commas.`, "error");
  return [...new Set(list.map((e) => e.toLowerCase()))].join(", ");
}
