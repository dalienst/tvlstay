import type { ItemPrice } from "./db/schema";

const fmt = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });

export const money = (amount: number) => `KES ${fmt.format(amount)}`;

/** Prices that have an amount, i.e. the ones guests see. */
export const shownPrices = (prices: ItemPrice[]) => prices.filter((p) => p.amount !== null && p.amount !== undefined);

/** "90 min · KES 7,000" (or "KES 7,000" when there's no option name). Used as the option a guest picked. */
export function optionText(p: ItemPrice) {
  const amount = p.amount != null ? money(p.amount) : "";
  return [p.label, amount].filter(Boolean).join(" · ");
}
