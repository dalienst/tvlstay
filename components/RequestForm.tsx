"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendRequest, type RequestState } from "@/app/[property]/request-actions";

const TOPICS = ["Wi-Fi or internet", "TV", "Air conditioning", "Hot water", "Lights or power", "Noise", "Something else"];

/** Asks for one service (serviceId) or reports a problem (kind "issue"). */
export function RequestForm({
  property,
  serviceId,
  kind = "service",
  room,
  options,
  submitLabel = "Send request",
}: {
  property: string;
  serviceId?: number;
  kind?: "service" | "issue";
  room?: string | null;
  /** Priced options (e.g. "60 min · KES 5,000"); the guest picks one. */
  options?: string[];
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState<RequestState, FormData>(sendRequest, null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  if (state?.ok)
    return (
      <div role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <p className="font-semibold">Sent. Thank you!</p>
        <p className="mt-0.5">Reception has your request (#{state.id}). You can follow it under “Your requests”.</p>
      </div>
    );

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="property" value={property} />
      <input type="hidden" name="kind" value={kind} />
      {serviceId && <input type="hidden" name="serviceId" value={serviceId} />}
      {kind === "issue" && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">What&apos;s it about?</span>
          <select name="topic" className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5">
            {TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      )}
      {options && options.length > 1 && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Which one?</span>
          <select name="option" required defaultValue="" className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5">
            <option value="" disabled>
              Choose…
            </option>
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
      )}
      {room ? (
        <p className="text-sm text-stone-600">
          For <b>room {room}</b>
        </p>
      ) : (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Room or apartment number</span>
          <input name="room" required maxLength={30} autoComplete="off" className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5" />
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{kind === "issue" ? "What's wrong?" : "Anything we should know? (optional)"}</span>
        <textarea
          name="message"
          rows={3}
          maxLength={1000}
          required={kind === "issue"}
          placeholder={kind === "issue" ? "e.g. The Wi-Fi keeps dropping in the bedroom" : "e.g. Two towels please, by the main pool"}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Your name (optional)</span>
          <input name="name" maxLength={80} autoComplete="name" className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Phone (optional)</span>
          <input name="contact" type="tel" maxLength={40} autoComplete="tel" className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5" />
        </label>
      </div>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
