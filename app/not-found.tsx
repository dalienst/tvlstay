import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-serif text-3xl">Page not found</h1>
      <p className="mt-2 text-stone-600">This page may have moved. Head back to the guide.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white">
        Back to the guide
      </Link>
    </main>
  );
}
