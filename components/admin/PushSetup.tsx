"use client";

import { useEffect, useState } from "react";

// "Alerts on this phone": turns on push notifications for guest requests on this device.
// On iPhone, alerts only work from the admin added to the Home Screen (iOS 16.4 or later).

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function deviceName() {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Computer";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${browser}`;
}

function keyBytes(base64: string) {
  const s = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export function PushSetup({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration("/admin/");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    if (!publicKey) return;
    setBusy(true);
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin/" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      const res = await fetch("/admin/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), scope, device: deviceName() }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save.");
      setState("on");
      setNote("Alerts are on for this device. Send a test to check.");
    } catch (err) {
      setNote((err as Error).message || "Couldn't turn alerts on.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/admin/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/admin/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
      setNote("Alerts are off for this device.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const res = await fetch("/admin/api/push", { method: "PUT" });
      const { sent } = (await res.json()) as { sent?: number };
      setNote(sent ? "Test sent. It should appear in a few seconds." : "Nothing was sent. Try turning alerts off and on again.");
    } finally {
      setBusy(false);
    }
  }

  if (!publicKey) {
    return <p className="text-sm text-stone-600">Phone alerts aren&apos;t set up on the server yet. Ask whoever manages the site to add the VAPID keys.</p>;
  }
  if (state === "loading") return <p className="text-sm text-stone-500">Checking this device…</p>;
  if (state === "ios-install") {
    return (
      <div className="space-y-2 text-sm text-stone-700">
        <p>On iPhone, alerts work from the Home Screen app:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            In Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>.
          </li>
          <li>Open “TV Requests” from your Home Screen and sign in.</li>
          <li>Come back to Your account and turn alerts on.</li>
        </ol>
        <p className="text-xs text-stone-500">Needs iOS 16.4 or later.</p>
      </div>
    );
  }
  if (state === "unsupported") return <p className="text-sm text-stone-600">This browser can&apos;t show alerts. Try Chrome on Android or a computer.</p>;
  if (state === "denied") {
    return (
      <p className="text-sm text-stone-700">
        Notifications are blocked for this site. Allow them in your browser or phone settings (Site settings → Notifications), then reload this page.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {state === "off" ? (
        <>
          <fieldset className="space-y-1.5 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} className="accent-brand" />
              Every new guest request I can handle
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="scope" checked={scope === "mine"} onChange={() => setScope("mine")} className="accent-brand" />
              Only requests assigned to me
            </label>
          </fieldset>
          <button type="button" onClick={turnOn} disabled={busy} className="btn-primary">
            Turn on alerts on this device
          </button>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">Alerts are on</span>
          <button type="button" onClick={test} disabled={busy} className="btn btn-sm">
            Send a test
          </button>
          <button type="button" onClick={turnOff} disabled={busy} className="btn btn-sm">
            Turn off
          </button>
        </div>
      )}
      {note && (
        <p role="status" className="text-sm text-stone-600">
          {note}
        </p>
      )}
    </div>
  );
}
