/**
 * Outlet kinds. Outlets are the places with menus (restaurants, bars, the casino, the dhow);
 * they all show under Dining for guests. Pools, housekeeping, the gym and other services
 * are Facilities, which have their own pages and requestable services.
 */
export const OUTLET_KINDS = [
  ["restaurant", "Restaurant"],
  ["bar", "Bar"],
  ["terrace", "Terrace / lounge"],
  ["cafe", "Café"],
  ["casino", "Casino"],
  ["dhow", "Dhow / cruise"],
] as const;

export const kindLabel = (kind: string) => OUTLET_KINDS.find(([k]) => k === kind)?.[1] ?? kind;
