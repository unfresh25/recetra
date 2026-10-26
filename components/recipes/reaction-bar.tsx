"use client";

import Link from "next/link";
import { createContext, use, useOptimistic, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AddToPlan } from "./add-to-plan";
import type { PlacementWeek } from "@/lib/plan/placement";
import type { MealType } from "@/lib/plan/types";
import { dayLabel, dayOfMonth } from "@/lib/plan/week";
import { Icon } from "@/components/ui/icon";
import { toggleReaction } from "@/lib/plan/actions";
import { LikePill } from "./like-button";

type State = { favorite: boolean; dislike: boolean; veto: boolean };
type Ctx = { state: State; likes: number; pending: boolean; toggle: (kind: keyof State) => void };

const ReactionContext = createContext<Ctx | null>(null);

/** Shares one optimistic reaction state between the hero heart and the action pills. */
export function ReactionProvider({ recipeId, mine, likes, children }: { recipeId: string; mine: State; likes: number; children: ReactNode }) {
  const [state, setOptimistic] = useOptimistic(mine, (s: State, kind: keyof State) => ({ ...s, [kind]: !s[kind] }));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function toggle(kind: keyof State) {
    if (kind === "veto" && !state.veto && !confirm("¿Vetar esta receta? No volverá a salir en el plan del hogar.")) return;
    setError(false);
    startTransition(async () => {
      setOptimistic(kind);
      try {
        await toggleReaction(recipeId, kind);
      } catch {
        setError(true);
      }
    });
  }

  return (
    <ReactionContext value={{ state, toggle, pending, likes: Math.max(0, likes + Number(state.favorite) - Number(mine.favorite)) }}>
      {error ? <p role="alert" className="px-5 py-2 text-sm text-ink">No pudimos guardar tu reacción. Intenta de nuevo.</p> : null}
      {children}
    </ReactionContext>
  );
}

function useReactions() {
  const ctx = use(ReactionContext);
  if (!ctx) throw new Error("ReactionProvider missing");
  return ctx;
}

/** Heart over the hero, CREME-style. */
export function FavoriteButton() {
  const { state, toggle, likes, pending } = useReactions();
  return <LikePill liked={state.favorite} likes={likes} pending={pending} onClick={() => toggle("favorite")} className="min-h-[38px] min-w-[38px]" />;
}

/** Reactions share the hero's optimistic state; plan feedback stays outside the scroll row. */
export function ActionPills({ recipeId, mealTypes, weeks, today }: { recipeId: string; mealTypes: MealType[]; weeks: PlacementWeek[]; today: string }) {
  const { state, toggle, pending } = useReactions();
  const [addedDay, setAddedDay] = useState<string>();
  const pillClass = "h-[38px] shrink-0 gap-2 border-line px-4 text-[13.5px] shadow-none";
  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <AddToPlan recipeId={recipeId} mealTypes={mealTypes} weeks={weeks} today={today} onAdded={setAddedDay} />
        <Link href="/ask" className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-full border border-line px-4 font-display text-[13.5px]">
          <Icon name="chef-hat" size={18} /> Preguntar
        </Link>
        <Button size="sm" disabled={pending} aria-pressed={state.dislike} onPress={() => toggle("dislike")} variant={state.dislike ? "primary" : "secondary"} className={pillClass}>
          <Icon name="thumbs-down" size={18} /> No me gusta
        </Button>
        <Button size="sm" disabled={pending} aria-pressed={state.veto} onPress={() => toggle("veto")} variant={state.veto ? "primary" : "secondary"} className={pillClass}>
          <Icon name="ban" size={18} /> {state.veto ? "Vetada" : "Vetar"}
        </Button>
      </div>
      {addedDay ? <p role="status" className="text-sm text-ink">Agregada al plan del {dayLabel(addedDay, "long").toLowerCase()} {dayOfMonth(addedDay)}. <Link href={`/plan?day=${addedDay}`} className="font-semibold underline underline-offset-4">Ver plan</Link></p> : null}
    </div>
  );
}
