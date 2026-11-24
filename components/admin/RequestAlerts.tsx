"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// Live alerts for guest requests, on every admin page for staff who handle them:
// checks for new requests every 15 seconds, plays a chime (if sound is on), shows a pop-up,
// puts the count in the browser tab, and refreshes the Requests page. Leave Requests open
// on the reception tablet or PC and new requests come in by themselves.

type Latest = { id: number; title: string; kind: string; room: string | null; deliverTo: string | null } | null;
const SOUND_KEY = "tvl-request-sound";
const POLL_MS = 15_000;

function readSound() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function RequestAlerts() {
  const router = useRouter();
  const pathname = usePathname();
  const [sound, setSound] = useState(true);
  const [toast, setToast] = useState<Latest>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const lastId = useRef<number | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const waiting = useRef(0);

  useEffect(() => setSound(readSound()), []);

  // "(3) Requests · Admin": how many requests are waiting, in the browser tab.
  function applyTitle() {
    const base = document.title.replace(/^\(\d+\) /, "");
    const next = waiting.current ? `(${waiting.current}) ${base}` : base;
    if (document.title !== next) document.title = next;
  }

  const ctx = useCallback(() => {
    if (!audio.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      audio.current = new AC();
    }
    return audio.current;
  }, []);

  // Browsers only allow sound after someone has clicked or tapped the page once.
  useEffect(() => {
    const unlock = () => {
      ctx()?.resume().catch(() => {});
      setNeedsTap(false);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [ctx]);

  const chime = useCallback(() => {
    const ac = ctx();
    if (!ac) return;
    if (ac.state !== "running") {
      setNeedsTap(true);
      return;
    }
    // Two soft notes, like a reception bell.
    [880, 1320].forEach((freq, i) => {
      const t = ac.currentTime + i * 0.18;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }, [ctx]);

  useEffect(() => {
    let stopped = false;
    async function check() {
      try {
        const res = await fetch("/admin/api/requests/latest", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const { count, latest } = (await res.json()) as { count: number; latest: Latest };
        waiting.current = count;
        applyTitle();
        const isNew = latest && lastId.current !== null && latest.id > lastId.current;
        if (latest && (lastId.current === null || latest.id > lastId.current)) lastId.current = latest.id;
        else if (lastId.current === null) lastId.current = 0;
        if (isNew) {
          setToast(latest);
          if (readSound()) chime();
          const typing = document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement;
          if (!typing) router.refresh();
        }
      } catch {
        /* offline for a moment: try again next time */
      }
    }
    check();
    const t = setInterval(check, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [chime, router]);

  // Next sets the tab title on every page change and refresh; put the count back in front.
  useEffect(() => {
    applyTitle();
    // Next may swap the <title> element itself, so watch the whole <head>.
    const obs = new MutationObserver(applyTitle);
    obs.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => obs.disconnect();
  }, [pathname]);

  const toggle = () => {
    const next = !sound;
    setSound(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {}
    if (next) {
      ctx()?.resume().catch(() => {});
      chime();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="rounded-full border border-stone-200 px-2.5 py-1 text-xs text-stone-600 hover:border-brand hover:text-brand"
        aria-pressed={sound}
        title={sound ? "A chime plays when a guest request arrives. Click to mute." : "Muted. Click to play a chime when a guest request arrives."}
      >
        {sound ? "🔔 Sound on" : "🔕 Sound off"}
      </button>
      {toast && (
        <div role="status" className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-brand/30 bg-white p-4 shadow-xl print:hidden">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">{toast.kind === "issue" ? "Problem reported" : "New request"}</p>
          <p className="mt-1 font-medium">{toast.title}</p>
          <p className="text-sm text-stone-600">
            {[toast.deliverTo && !toast.deliverTo.startsWith("Room ") ? toast.deliverTo : null, toast.room ? `Room ${toast.room}` : null].filter(Boolean).join(" · ")}
          </p>
          {needsTap && sound && <p className="mt-1 text-xs text-amber-800">Tap the page once so the chime can play next time.</p>}
          <div className="mt-3 flex gap-2">
            <Link href={`/admin/requests#r${toast.id}`} onClick={() => setToast(null)} className="btn-primary btn-sm">
              Open
            </Link>
            <button type="button" onClick={() => setToast(null)} className="btn btn-sm">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
}
