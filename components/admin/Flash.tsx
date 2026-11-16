export function Flash({ msg, err }: { msg?: string; err?: string }) {
  if (!msg && !err) return null;
  return (
    <p
      role={err ? "alert" : "status"}
      className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${
        err ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}
    >
      {err ?? msg}
    </p>
  );
}
