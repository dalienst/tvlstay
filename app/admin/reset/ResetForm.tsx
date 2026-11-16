"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "../reset-actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  if (state?.ok)
    return (
      <div role="status" className="space-y-3">
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Password changed. You&apos;ve been signed out on other devices.
        </p>
        <Link href="/admin/login" className="btn-primary block w-full text-center">
          Sign in
        </Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="label">New password</span>
        <input name="next" type="password" autoComplete="new-password" minLength={10} required className="input" />
      </label>
      <label className="block">
        <span className="label">Type it again</span>
        <input name="confirm" type="password" autoComplete="new-password" minLength={10} required className="input" />
      </label>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
