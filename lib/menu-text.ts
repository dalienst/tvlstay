// Parses the simple menu text format in scripts/data/*.txt:
//
//   # Menu name | served note
//   ## Section name | section description
//   Item name | price | description | tag, tag
//
// The price column is a number (1900), blank, or variants separated by ";":
//   "Chicken=2100; Fish=2400"   "Glass=1300; Bottle=5000"   "Bottle=5200 was 6500"
import type { ItemPrice } from "./db/schema";

export type ParsedItem = { name: string; description: string | null; prices: ItemPrice[]; tags: string[] };
export type ParsedSection = { name: string; description: string | null; items: ParsedItem[] };
export type ParsedMenu = { name: string; servedNote: string | null; sections: ParsedSection[] };

/** Parses the price box: "1900", "Chicken=2100; Fish=2400", "Bottle=5200 was 6500". Throws on nonsense. */
export function parsePrice(raw: string): ItemPrice[] {
  const s = raw.trim();
  if (!s) return [];
  return s.split(";").map((part) => {
    const [labelOrAmount, rest] = part.includes("=") ? part.split("=") : [undefined, part];
    const m = rest.trim().match(/^([\d,]+)(?:\s+was\s+([\d,]+))?$/i);
    if (!m) throw new Error(`"${part.trim()}" isn't a price. Use numbers like 1900, or Glass=1300; Bottle=5000.`);
    const price: ItemPrice = { amount: Number(m[1].replace(/,/g, "")) };
    if (labelOrAmount) price.label = labelOrAmount.trim();
    if (m[2]) price.was = Number(m[2].replace(/,/g, ""));
    return price;
  });
}

export function parseMenuText(text: string): ParsedMenu {
  const menu: ParsedMenu = { name: "", servedNote: null, sections: [] };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const cols = line.replace(/^#+\s*/, "").split("|").map((c) => c.trim());
    if (line.startsWith("## ")) {
      menu.sections.push({ name: cols[0], description: cols[1] || null, items: [] });
    } else if (line.startsWith("# ")) {
      menu.name = cols[0];
      menu.servedNote = cols[1] || null;
    } else {
      const section = menu.sections.at(-1);
      if (!section) throw new Error(`Item before any section: ${line}`);
      section.items.push({
        name: cols[0],
        prices: parsePrice(cols[1] ?? ""),
        description: cols[2] || null,
        tags: (cols[3] ?? "").split(",").map((t) => t.trim()).filter(Boolean),
      });
    }
  }
  return menu;
}

/** The reverse of parsePrice, for the edit box. */
export function priceText(prices: ItemPrice[]) {
  return prices
    .filter((p) => p.amount !== null && p.amount !== undefined)
    .map((p) => `${p.label ? `${p.label}=` : ""}${p.amount}${p.was ? ` was ${p.was}` : ""}`)
    .join("; ");
}
