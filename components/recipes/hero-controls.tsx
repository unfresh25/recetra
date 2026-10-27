"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ShareConfirmation, useRecipeShare } from "./share-confirmation";

const controlClass = "btn-float flex size-[38px] items-center justify-center rounded-full bg-canvas/90 text-ink";

export function RecipeBackButton() {
  const router = useRouter();
  return <button type="button" aria-label="Volver" onClick={() => window.history.length > 1 ? router.back() : router.replace("/discover")} className={controlClass}><Icon name="arrow-left" size={20} /></button>;
}

export function RecipeShareButton({ title }: { title: string }) {
  const { message, share } = useRecipeShare(title);
  return <>
    <button type="button" aria-label="Compartir receta" onClick={share} className={controlClass}><Icon name="share" size={18} /></button>
    <ShareConfirmation message={message} className="absolute top-full right-3 mt-2 max-w-64 rounded-full bg-canvas text-ink [&>p]:px-4 [&>p]:py-2" />
  </>;
}
