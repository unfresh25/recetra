"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { getNavigationStack, resolveRecipeOrigin } from "@/lib/navigation/origin";
import { ShareConfirmation, useRecipeShare } from "./share-confirmation";

const controlClass = "btn-float flex size-[38px] items-center justify-center rounded-full bg-canvas/90 text-ink";

export function RecipeBackButton() {
  const router = useRouter();
  function goToOrigin() {
    const { target, steps } = resolveRecipeOrigin(getNavigationStack(), window.location.pathname + window.location.search);
    if (steps !== null && steps > 0) window.history.go(-steps);
    else router.push(target);
  }
  return <button type="button" aria-label="Volver" onClick={goToOrigin} className={controlClass}><Icon name="arrow-left" size={20} /></button>;
}

export function RecipeShareButton({ title }: { title: string }) {
  const { message, share } = useRecipeShare(title);
  return <>
    <button type="button" aria-label="Compartir receta" onClick={share} className={controlClass}><Icon name="share" size={18} /></button>
    <ShareConfirmation message={message} className="absolute top-full right-3 mt-2 max-w-64 rounded-full bg-canvas text-ink [&>p]:px-4 [&>p]:py-2" />
  </>;
}
