"use client";

import { useEffect } from "react";

let visitedPlan = false;

/** Once per document visit, so week links and returning from recipes keep their position. */
export function ScrollToToday({ today, enabled }: { today: string; enabled: boolean }) {
  useEffect(() => {
    if (visitedPlan) return;
    visitedPlan = true;
    if (enabled) document.getElementById(`plan-${today}`)?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [today, enabled]);
  return null;
}
