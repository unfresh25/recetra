"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useOptimistic, useTransition, type ReactNode } from "react";
import { DrawablyButton } from "@/components/ui/drawably";
import { Icon } from "@/components/ui/icon";
import { toggleReaction } from "@/lib/plan/actions";
import { cn } from "@/lib/utils/cn";

type State = { favorite: boolean; dislike: boolean; veto: boolean };
type Ctx = { state: State; toggle: (kind: keyof State) => void };

const ReactionContext = createContext<Ctx | null>(null);

/** Shares one optimistic reaction state between the hero heart and the action pills. */
export function ReactionProvider({ recipeId, mine, children }: { recipeId: string; mine: State; children: ReactNode }) {
  const [state, setOptimistic] = useOptimistic(mine, (s: State, kind: keyof State) => ({ ...s, [kind]: !s[kind] }));
  const [, startTransition] = useTransition();

  function toggle(kind: keyof State) {
    if (kind === "veto" && !state.veto && !confirm("¿Vetar esta receta? No volverá a salir en el plan del hogar.")) return;
    startTransition(async () => {
      setOptimistic(kind);
      await toggleReaction(recipeId, kind);
    });
  }

  return <ReactionContext value={{ state, toggle }}>{children}</ReactionContext>;
}

function useReactions() {
  const ctx = use(ReactionContext);
  if (!ctx) throw new Error("ReactionProvider missing");
  return ctx;
}

/** Heart over the hero, CREME-style. */
export function FavoriteButton() {
  const { state, toggle } = useReactions();
  return (
    <button
      type="button"
      aria-pressed={state.favorite}
      aria-label={state.favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
      onClick={() => toggle("favorite")}
      className={cn("flex size-11 items-center justify-center", state.favorite ? "text-brand" : "text-white")}
    >
      <Icon name="heart" size={26} strokeWidth={state.favorite ? 2.6 : 1.8} />
    </button>
  );
}

/** Horizontal action pills under the title: cook, dislike, veto. */
export function ActionPills({ cookHref }: { cookHref: string | null }) {
  const { state, toggle } = useReactions();
  const router = useRouter();
  useEffect(() => {
    if (cookHref) router.prefetch(cookHref);
  }, [cookHref, router]);
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {cookHref ? (
        <DrawablyButton
          type="button"
          variant="solid"
          onClick={() => router.push(cookHref)}
          className="h-11 shrink-0 px-5 font-bold"
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="fire" size={18} /> Cocinar
          </span>
        </DrawablyButton>
      ) : null}
      <DrawablyButton
        type="button"
        aria-pressed={state.dislike}
        onClick={() => toggle("dislike")}
        variant={state.dislike ? "solid" : "outline"}
        tone={state.dislike ? undefined : "neutral"}
        className="h-11 shrink-0 px-4 font-semibold"
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="thumbs-down" size={18} /> No me gusta
        </span>
      </DrawablyButton>
      <DrawablyButton
        type="button"
        aria-pressed={state.veto}
        onClick={() => toggle("veto")}
        variant={state.veto ? "solid" : "outline"}
        tone={state.veto ? undefined : "neutral"}
        className="h-11 shrink-0 px-4 font-semibold"
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="ban" size={18} /> {state.veto ? "Vetada" : "Vetar"}
        </span>
      </DrawablyButton>
    </div>
  );
}
