import Image from "next/image";
import Link from "next/link";
import { findReset } from "@/lib/auth/reset";
import { ResetForm } from "./ResetForm";

export const metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).token;
  const token = Array.isArray(raw) ? raw[0] : (raw ?? "");
  const found = await findReset(token);
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="panel w-full max-w-sm p-6 shadow-sm">
        <Image src="/logos/tamgrouplogo.png" alt="The Tamarind Group" width={140} height={91} className="mx-auto mb-4" priority />
        <h1 className="font-serif text-2xl">Choose a new password</h1>
        {found ? (
          <>
            <p className="mb-6 text-sm text-stone-500">For {found.user.email}. At least 10 characters.</p>
            <ResetForm token={token} />
          </>
        ) : (
          <p className="mt-2 text-sm text-stone-600">
            This link has expired or was already used.{" "}
            <Link href="/admin/forgot" className="text-brand underline">
              Ask for a new one
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
