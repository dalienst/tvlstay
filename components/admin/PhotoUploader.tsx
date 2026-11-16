"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkForUpload } from "@/lib/shrink-image";

export function PhotoUploader({ properties }: { properties: { id: number; name: string }[] | null }) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string>(properties?.[0] ? String(properties[0].id) : "");

  return (
    <div className="panel flex flex-wrap items-center gap-3 p-4">
      {properties && (
        <label className="text-sm">
          <span className="mr-2 text-stone-600">Upload to</span>
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="input inline-block w-auto py-1">
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="">Whole group</option>
          </select>
        </label>
      )}
      <button type="button" className="btn-primary" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? "Uploading…" : "Upload photos"}
      </button>
      <span className="text-xs text-stone-500">JPG, PNG or HEIC up to 15 MB each. Large photos are resized automatically.</span>
      {msg && <span className="w-full text-sm text-stone-700">{msg}</span>}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = e.target.files;
          if (!files?.length) return;
          setBusy(true);
          setMsg(null);
          let done = 0;
          let error: string | null = null;
          for (const f of Array.from(files)) {
            const body = new FormData();
            body.append("file", await shrinkForUpload(f));
            if (propertyId) body.append("propertyId", propertyId);
            const res = await fetch("/admin/api/media", { method: "POST", body });
            const json = await res.json().catch(() => ({ error: `${f.name}: upload failed. Try a smaller photo.` }));
            if (res.ok) done++;
            else error = json.error;
          }
          setBusy(false);
          e.target.value = "";
          setMsg(`Uploaded ${done} photo${done === 1 ? "" : "s"}.${error ? ` ${error}` : ""}`);
          router.refresh();
        }}
      />
    </div>
  );
}
