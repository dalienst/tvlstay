import { requireUser } from "@/lib/auth/current";
import { first } from "@/lib/admin/form";
import { Flash } from "@/components/admin/Flash";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { changePassword } from "../../actions";

export const metadata = { title: "Your account" };

export default async function Account({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser({ allowTemporaryPassword: true });
  const sp = await searchParams;
  return (
    <div className="max-w-md">
      <h1 className="font-serif text-3xl">Your account</h1>
      <p className="mt-1 text-sm text-stone-500">
        {user.name} · {user.email}
      </p>
      {user.mustChangePassword && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          You're using a temporary password. Choose your own to continue.
        </p>
      )}
      <div className="mt-4">
        <Flash msg={first(sp.msg)} err={first(sp.err)} />
      </div>
      <form action={changePassword} className="panel space-y-4 p-5">
        <label className="block">
          <span className="label">Current password</span>
          <input name="current" type="password" autoComplete="current-password" required className="input" />
        </label>
        <label className="block">
          <span className="label">New password (at least 10 characters)</span>
          <input name="next" type="password" autoComplete="new-password" minLength={10} required className="input" />
        </label>
        <label className="block">
          <span className="label">Confirm new password</span>
          <input name="confirm" type="password" autoComplete="new-password" minLength={10} required className="input" />
        </label>
        <SubmitButton>Change password</SubmitButton>
      </form>
    </div>
  );
}
