import { cookies } from "next/headers";

export const REQUESTS_COOKIE = "tvl_requests";
export const MAX_REQUESTS_PER_HOUR = 10;

/** Ids of the requests this browser has sent (newest last), so the guest can follow them. */
export async function myRequestIds(): Promise<number[]> {
  const raw = (await cookies()).get(REQUESTS_COOKIE)?.value ?? "";
  return raw
    .split(".")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(-20);
}

export const GUEST_STATUS: Record<string, { label: string; className: string }> = {
  new: { label: "Sent", className: "bg-stone-100 text-stone-700" },
  in_progress: { label: "On its way", className: "bg-amber-100 text-amber-900" },
  done: { label: "Done", className: "bg-emerald-50 text-emerald-800" },
  cancelled: { label: "Cancelled", className: "bg-stone-100 text-stone-500" },
};
