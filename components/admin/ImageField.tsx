"use client";

import { useRef, useState } from "react";
import { shrinkForUpload } from "@/lib/shrink-image";

type MediaRow = { id: number; url: string; filename: string; width: number | null; height: number | null };

/** Uploads one file per request so each stays under the hosting size limit. */
async function upload(files: FileList, propertyId?: number | null): Promise<string[]> {
  const urls: string[] = [];
  for (const f of Array.from(files)) {
    const body = new FormData();
    body.append("file", await shrinkForUpload(f));
    if (propertyId) body.append("propertyId", String(propertyId));
    const res = await fetch("/admin/api/media", { method: "POST", body });
    const json = await res.json().catch(() => ({ error: "Upload failed. Try a smaller photo." }));
    if (!res.ok) throw new Error(json.error ?? "Upload failed.");
    urls.push(...(json as { url: string }[]).map((r) => r.url));
  }
  return urls;
}

/** Shared buttons: upload from the computer/phone, pick from the photo library, or paste a link. */
function ImageSource({
  propertyId,
  multiple,
  onPick,
}: {
  propertyId?: number | null;
  multiple?: boolean;
  onPick: (urls: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState<MediaRow[] | null>(null);
  const [link, setLink] = useState("");

  async function openLibrary() {
    setError(null);
    const res = await fetch(`/admin/api/media${propertyId ? `?property=${propertyId}` : ""}`);
    if (!res.ok) return setError("Couldn't load the photo library.");
    setLibrary(await res.json());
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "Uploading…" : "Upload photo"}
        </button>
        <button type="button" className="btn btn-sm" onClick={openLibrary}>
          Choose from library
        </button>
        <span className="flex min-w-48 flex-1 gap-1">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="…or paste an image link (https://)"
            className="input py-1 text-xs"
          />
          <button
            type="button"
            className="btn btn-sm"
            disabled={!/^https?:\/\/|^\//.test(link.trim())}
            onClick={() => {
              onPick([link.trim()]);
              setLink("");
            }}
          >
            Use link
          </button>
        </span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={async (e) => {
          if (!e.target.files?.length) return;
          setBusy(true);
          setError(null);
          try {
            onPick(await upload(e.target.files, propertyId));
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      {library && (
        <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-2">
          <div className="mb-2 flex items-center justify-between text-xs text-stone-600">
            <span>{library.length ? "Click a photo to use it." : "No photos uploaded yet."}</span>
            <button type="button" className="underline" onClick={() => setLibrary(null)}>
              Close
            </button>
          </div>
          <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
            {library.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.filename}
                onClick={() => {
                  onPick([m.url]);
                  if (!multiple) setLibrary(null);
                }}
                className="aspect-square overflow-hidden rounded-md border border-stone-200 bg-white hover:ring-2 hover:ring-brand"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.filename} className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** One image (logo, cover photo, dish photo). Submits its URL under `name`. */
export function ImageField({
  name,
  label,
  defaultValue,
  propertyId,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  propertyId?: number | null;
  hint?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={value} />
      {value ? (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-24 w-32 rounded-lg border border-stone-200 object-cover" />
          <div className="min-w-0 text-xs text-stone-500">
            <p className="break-all">{value}</p>
            <button type="button" className="mt-1 text-red-700 underline" onClick={() => setValue("")}>
              Remove photo
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-stone-500">No photo.</p>
      )}
      <ImageSource propertyId={propertyId} onPick={(urls) => setValue(urls[0])} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/** Several images in order (photo gallery). Submits a JSON array under `name`. */
export function GalleryField({
  name,
  label,
  defaultValue,
  propertyId,
}: {
  name: string;
  label: string;
  defaultValue: string[];
  propertyId?: number | null;
}) {
  const [urls, setUrls] = useState(defaultValue);
  const move = (i: number, d: number) =>
    setUrls((u) => {
      const next = [...u];
      const j = i + d;
      if (j < 0 || j >= next.length) return u;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={JSON.stringify(urls)} />
      {urls.length === 0 && <p className="text-xs text-stone-500">No photos yet.</p>}
      <ul className="flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <li key={`${u}-${i}`} className="w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-24 w-32 rounded-lg border border-stone-200 object-cover" />
            <div className="mt-1 flex justify-between text-xs">
              <span className="flex gap-2">
                <button type="button" onClick={() => move(i, -1)} aria-label="Move left" className="text-stone-600">
                  ←
                </button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Move right" className="text-stone-600">
                  →
                </button>
              </span>
              <button type="button" className="text-red-700 underline" onClick={() => setUrls(urls.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <ImageSource propertyId={propertyId} multiple onPick={(picked) => setUrls((u) => [...u, ...picked])} />
    </div>
  );
}
