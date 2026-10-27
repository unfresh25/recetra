"use client";

import { useEffect } from "react";
import { trackNavigation } from "@/lib/navigation/origin";

export function NavigationTracker() {
  useEffect(() => {
    let disposed = false;
    let stop: (() => void) | undefined;
    // Install after Next's own history hooks, including Strict Mode's effect replay.
    queueMicrotask(() => { if (!disposed) stop = trackNavigation(); });
    return () => { disposed = true; stop?.(); };
  }, []);
  return null;
}
