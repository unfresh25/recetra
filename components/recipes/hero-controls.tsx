"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";

const controlClass = "flex size-[38px] items-center justify-center rounded-full bg-canvas/90 text-ink";

export function RecipeBackButton() {
  const router = useRouter();
  return <button type="button" aria-label="Volver" onClick={() => window.history.length > 1 ? router.back() : router.replace("/discover")} className={controlClass}><Icon name="arrow-left" size={20} /></button>;
}

export function RecipeShareButton({ title }: { title: string }) {
  const [message, setMessage] = useState<string>();
  async function share() {
    setMessage(undefined);
    const url = window.location.href;
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
      setMessage("Enlace copiado");
    } catch {
      setMessage("No pudimos copiar el enlace. Cópialo de la barra del navegador.");
    }
  }
  return <>
    <button type="button" aria-label="Compartir receta" onClick={share} className={controlClass}><Icon name="share" size={18} /></button>
    {message ? <p role="status" className="absolute top-full right-3 mt-2 max-w-64 rounded-full bg-canvas px-4 py-2 text-xs text-ink">{message}</p> : null}
  </>;
}
