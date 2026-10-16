"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/onboarding/actions";

/** Runs a save action and navigates to `nextHref` on success. */
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
      router.push(nextHref);
      router.refresh();
    });
  }

  return { save, pending, error };
}
