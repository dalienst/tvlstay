"use client";

import { useEffect, useMemo, useState } from "react";
import type { ItemPrice } from "@/lib/db/schema";
import { Icon } from "./Icon";

type Item = {
  id: number;
  name: string;
  description: string | null;
  prices: ItemPrice[];
  priceNote: string | null;
  tags: string[];
  imageUrl: string | null;
  isAvailable: boolean;
};
type Section = { id: number; name: string; description: string | null; items: Item[] };

const TAG_LABELS: Record<string, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  spicy: "Spicy",
  signature: "Signature",
  "sugar-free": "Sugar free",
  "alcohol-free": "Alcohol free",
  "gluten-free": "Gluten free",
  new: "New",
};

const fmt = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });

/** Prices stacked on the right: "3,000", or "Glass 1,300 / Bottle 5,000", with sale prices struck through. */
function Prices({ prices, note, currency }: { prices: ItemPrice[]; note: string | null; currency: string }) {
  const shown = prices.filter((p) => p.amount !== null && p.amount !== undefined);
  if (!shown.length) return note ? <span className="shrink-0 text-sm italic text-stone-500">{note}</span> : null;
  const sym = currency === "KES" ? "" : `${currency} `;
  return (
    <span className="flex shrink-0 flex-col items-end gap-0.5 text-right tabular-nums">
      {shown.map((p, i) => (
        <span key={i} className="whitespace-nowrap">
          {p.label && <span className="mr-1.5 text-[13px] text-stone-500">{p.label}</span>}
          {p.was ? <s className="mr-1.5 text-[13px] text-stone-400">{fmt.format(p.was)}</s> : null}
          <span className="font-semibold">
            {sym}
            {fmt.format(p.amount!)}
          </span>
        </span>
      ))}
    </span>
  );
}

export function MenuView({ sections, currency }: { sections: Section[]; currency: string }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  // Bring the current menu's tab into view when the tab row scrolls sideways.
  useEffect(() => {
    document.querySelector('nav[aria-label="Menus"] [aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  const filtered = useMemo(() => {
    if (!query) return sections;
    return sections
      .map((s) => ({
        ...s,
        items: s.items.filter((i) =>
          [i.name, i.description ?? "", s.name, ...i.tags].join(" ").toLowerCase().includes(query),
        ),
      }))
      .filter((s) => s.items.length);
  }, [sections, query]);

  return (
    <>
      <div className="sticky top-[53px] z-10 border-b border-stone-200/70 bg-sand/95 backdrop-blur">
        <label className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 focus-within:border-brand/50">
          <Icon name="search" className="h-4 w-4 text-stone-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search this menu"
            className="w-full bg-transparent text-[16px] outline-none placeholder:text-stone-400"
          />
        </label>
        {!query && sections.length > 1 && (
          <nav aria-label="Sections" className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#s-${s.id}`}
                className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[13px] font-medium text-stone-700 hover:border-brand/40 hover:text-brand"
              >
                {s.name}
              </a>
            ))}
          </nav>
        )}
        {(query || sections.length <= 1) && <div className="h-3" />}
      </div>

      <div className="px-4 pt-2">
        {filtered.length === 0 && (
          <p className="py-16 text-center text-stone-500">Nothing on this menu matches “{q}”.</p>
        )}
        {filtered.map((s) => (
          <section key={s.id} id={`s-${s.id}`} className="pt-6">
            <h2 className="font-serif text-2xl text-brand">{s.name}</h2>
            {s.description && <p className="mt-1 text-sm text-stone-600">{s.description}</p>}
            <ul className="mt-2 divide-y divide-stone-200/70">
              {s.items.map((i) => (
                <li key={i.id} className={`flex gap-3 py-3.5 ${i.isAvailable ? "" : "opacity-50"}`}>
                  {i.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- admins can paste any image URL
                    <img src={i.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" loading="lazy" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold leading-snug">{i.name}</h3>
                        {i.description && <p className="mt-1 text-sm leading-relaxed text-stone-600">{i.description}</p>}
                      </div>
                      <Prices prices={i.prices} note={i.priceNote} currency={currency} />
                    </div>
                    {(i.tags.length > 0 || !i.isAvailable) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {!i.isAvailable && (
                          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                            Not available today
                          </span>
                        )}
                        {i.tags.map((t) => (
                          <span
                            key={t}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              t === "signature" ? "bg-gold/15 text-[#8a6a12]" : "bg-emerald-50 text-emerald-800"
                            }`}
                          >
                            {TAG_LABELS[t] ?? t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
