"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

export function BottomNav({ base }: { base: string }) {
  const path = usePathname();
  const tabs = [
    { href: base, label: "Home", icon: "home", exact: true },
    { href: `${base}/dining`, label: "Dining", icon: "utensils" },
    { href: `${base}/facilities`, label: "Facilities", icon: "sparkle" },
    { href: `${base}/info`, label: "Info", icon: "info" },
  ];
  return (
    <nav
      aria-label="Guide"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map((t) => {
          const active = t.exact ? path === t.href : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-brand" : "text-stone-500"}`}
              >
                <Icon name={t.icon} className="h-5 w-5" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
