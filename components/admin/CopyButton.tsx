"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="text-xs text-brand underline"
      onClick={async () => {
        await navigator.clipboard.writeText(new URL(text, window.location.origin).toString());
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copied" : "Copy link"}
    </button>
  );
}
