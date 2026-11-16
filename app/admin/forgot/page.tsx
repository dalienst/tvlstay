import Image from "next/image";
import Link from "next/link";
import { ForgotForm } from "./ForgotForm";

export const metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="panel w-full max-w-sm p-6 shadow-sm">
        <Image src="/logos/tamgrouplogo.png" alt="The Tamarind Group" width={140} height={91} className="mx-auto mb-4" priority />
        <h1 className="font-serif text-2xl">Forgot your password?</h1>
        <p className="mb-6 text-sm text-stone-500">Enter your work email and we&apos;ll send you a link to choose a new one.</p>
        <ForgotForm />
        <p className="mt-4 text-sm">
          <Link href="/admin/login" className="text-brand hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
