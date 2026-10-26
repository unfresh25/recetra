"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { finishSetup, type ActionResult } from "@/lib/onboarding/actions";

/** Saves the step, finishing setup before navigating to the plan. */
export function useStepSave(nextHref: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function save(action: () => Promise<ActionResult>) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (nextHref === "/plan") {
        const result = await finishSetup();
        setError(result.error);
        return;
      }
      router.push(nextHref);
      router.refresh();
    });
  }

  return { save, pending, error };
}
