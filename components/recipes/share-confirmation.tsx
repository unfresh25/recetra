"use client";

import { useLayoutEffect, useState } from "react";
import { createTransientMessage } from "@/lib/recipes/transient-message";
import { cn } from "@/lib/utils/cn";

export function useRecipeShare(title: string, path?: string) {
  const [message, setMessage] = useState<string>();
  const [confirmation] = useState(() => createTransientMessage(setMessage));
  // Cache Components can hide a page without discarding its state. Clear transient feedback too.
  useLayoutEffect(() => () => {
    confirmation.cancel();
    setMessage(undefined);
  }, [confirmation]);

  async function share() {
    const show = confirmation.begin();
    const url = path ? new URL(path, window.location.origin).href : window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      show("Enlace copiado");
    } catch {
      show("No pudimos copiar el enlace. Intenta de nuevo.");
    }
  }
  return { message, share };
}

export function ShareConfirmation({ message, className }: { message?: string; className?: string }) {
  return <div role="status" aria-live="polite" aria-atomic="true" className={cn("share-confirmation text-xs", className)}>
    {message ? <p>{message}</p> : null}
  </div>;
}
