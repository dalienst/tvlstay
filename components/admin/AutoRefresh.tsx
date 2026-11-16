"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Reloads the page's data every `seconds` while the tab is visible and nobody is typing. */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      const typing = document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement;
      if (document.visibilityState === "visible" && !typing) router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
