"use client";

import { useOptimistic, useTransition } from "react";
import { Avatar, type Accent } from "@/components/ui/avatar";
import { toggleReaction } from "@/lib/plan/actions";
import { cn } from "@/lib/utils/cn";

type State = { favorite: boolean; dislike: boolean; veto: boolean };

/** Each member reacts for themselves; the partner's favorite is shown, not editable. */
export function ReactionBar({
  recipeId,
  mine,
  partner,
}: {
  recipeId: string;
  mine: State;
  partner: { name: string; accent: Accent; favorite: boolean } | null;
}) {
  const [state, setOptimistic] = useOptimistic(mine, (s: State, kind: keyof State) => ({ ...s, [kind]: !s[kind] }));
  const [, startTransition] = useTransition();

  function toggle(kind: keyof State) {
    if (kind === "veto" && !state.veto && !confirm("¿Vetar esta receta? No volverá a salir en el plan del hogar.")) return;
    startTransition(async () => {
      setOptimistic(kind);
      await toggleReaction(recipeId, kind);
    });
  }

  const pill = "flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" aria-pressed={state.favorite} onClick={() => toggle("favorite")} className={cn(pill, state.favorite ? "bg-brand text-white" : "bg-sunken")}>
        {state.favorite ? "❤️" : "🤍"} Favorito
      </button>
      <button type="button" aria-pressed={state.dislike} onClick={() => toggle("dislike")} className={cn(pill, state.dislike ? "bg-ink text-white" : "bg-sunken")}>
        👎 No me gusta
      </button>
      <button type="button" aria-pressed={state.veto} onClick={() => toggle("veto")} className={cn(pill, state.veto ? "bg-ink text-white" : "bg-sunken")}>
        🚫 {state.veto ? "Vetada" : "Vetar"}
      </button>
      {partner ? (
        <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-muted">
          <Avatar name={partner.name} accent={partner.accent} size={22} />
          {partner.favorite ? "❤️ le encanta" : "aún no reacciona"}
        </span>
      ) : null}
    </div>
  );
}
