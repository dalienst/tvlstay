"use client";

import { useActionState } from "react";
import { requestReset } from "../reset-actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestReset, undefined);
  if (state?.ok)
    return (
      <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        If that email has a staff account, a reset link is on its way. It works once, for an hour. Check your spam folder if it doesn&apos;t
        arrive in a few minutes.
      </p>
    );
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Work email</span>
        <input name="email" type="email" autoComplete="username" required className="input" />
      </label>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
