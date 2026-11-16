import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth/current";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { canSeeRequests, newRequestCount } from "@/lib/admin/requests";
import { logout } from "../actions";

export const metadata = { title: { default: "Admin", template: "%s · Admin" } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser({ allowTemporaryPassword: true });
  const newRequests = await newRequestCount(user);
  const links = [
    ...(user.role === "requests_team" ? [] : [{ href: "/admin", label: "Properties" }]),
    ...(canSeeRequests(user) ? [{ href: "/admin/requests", label: "Requests", badge: newRequests }] : []),
    ...(user.role === "requests_team" ? [] : [{ href: "/admin/photos", label: "Photos" }]),
    ...(user.role === "super_admin"
      ? [
          { href: "/admin/staff", label: "Staff" },
          { href: "/admin/activity", label: "Activity" },
        ]
      : []),
    { href: "/admin/guide", label: "Guide" },
  ] as { href: string; label: string; badge?: number }[];
  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image src="/logos/tvllogo.png" alt="" width={42} height={32} />
            <span className="font-serif text-lg">Guest guide admin</span>
          </Link>
          <nav className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-5 overflow-x-auto whitespace-nowrap border-t border-stone-100 px-4 pt-2 text-sm md:order-none md:mx-0 md:w-auto md:border-0 md:p-0">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="py-1 text-stone-600 hover:text-brand">
                {l.label}
                {l.badge ? (
                  <span className="ml-1 rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-white" aria-label={`${l.badge} new`}>
                    {l.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-stone-500">
            <Link href="/admin/account" className="hover:text-stone-900" title="Change password">
              {user.name}
              <span className="hidden sm:inline"> · {ROLE_LABELS[user.role]}</span>
            </Link>
            <form action={logout}>
              <button className="underline hover:text-stone-900">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
