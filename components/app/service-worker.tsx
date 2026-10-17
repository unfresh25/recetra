"use client";

import { useEffect } from "react";

/** Registers the offline service worker (production only) and warms the main tabs. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => registration.active?.postMessage("warm-pages"))
      .catch(() => {});
  }, []);
  return null;
}
