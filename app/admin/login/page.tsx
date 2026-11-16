import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Staff sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="panel w-full max-w-sm p-6 shadow-sm">
        <Image src="/logos/tvllogo.png" alt="Tamarind Village" width={140} height={108} className="mx-auto mb-4" priority />
        <h1 className="font-serif text-2xl">Guest guide admin</h1>
        <p className="mb-6 text-sm text-stone-500">Sign in with your staff account.</p>
        <LoginForm />
        <p className="mt-4 text-sm">
          <Link href="/admin/forgot" className="text-brand hover:underline">
            Forgot password?
          </Link>
        </p>
      </div>
    </main>
  );
}
