"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reviewRecipe } from "@/lib/recipes/actions";
import { MEAL_TYPES, MEAL_TYPE_LABELS } from "@/lib/recipes/labels";
import type { Enums } from "@/lib/supabase/database.types";

/** Approve or discard an imported recipe, fixing when it is eaten first. */
export function DraftReview({ recipeId, initialMeals }: { recipeId: string; initialMeals: Enums<"meal_type">[] }) {
  const [meals, setMeals] = useState(() => new Set(initialMeals));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function toggle(meal: Enums<"meal_type">) {
    setMeals((prev) => {
      const next = new Set(prev);
      if (next.has(meal)) next.delete(meal);
      else next.add(meal);
      return next;
    });
  }

  function review(approve: boolean) {
    setError(undefined);
    startTransition(async () => {
      const result = await reviewRecipe(recipeId, approve, approve ? [...meals] : undefined);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">¿Cuándo se come?</p>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map((meal) => (
            <Button key={meal} size="sm" variant={meals.has(meal) ? "primary" : "secondary"} aria-pressed={meals.has(meal)} onPress={() => toggle(meal)} className="h-9 border-line px-3 text-sm shadow-none">
              {MEAL_TYPE_LABELS[meal]}
            </Button>
          ))}
        </div>
      </div>
      {error ? <p role="alert" className="text-sm text-ink">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <Button size="md" variant="secondary" disabled={pending} onClick={() => review(false)}>
          Descartar
        </Button>
        <Button size="md" loading={pending} disabled={meals.size === 0} onClick={() => review(true)}>
          Aprobar
        </Button>
      </div>
    </div>
  );
}
