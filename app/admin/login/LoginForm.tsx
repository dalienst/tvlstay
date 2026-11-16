"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" autoComplete="username" required className="input" />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="input" />
      </label>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
