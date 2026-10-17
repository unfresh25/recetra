"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { formatQuantity } from "@/lib/recipes/labels";
import { cn } from "@/lib/utils/cn";
import { IngredientRoleToggle } from "./ingredient-role-toggle";

export type IngredientLine = {
  position: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  accessory: boolean;
  /** Removed for this household's plan (dislike or diet). */
  removed: boolean;
};

function scale(quantity: number | null, factor: number) {
  if (quantity === null) return null;
  const v = quantity * factor;
  return v >= 10 ? Math.round(v) : Math.round(v * 4) / 4;
}

/** Plain ingredient list (no photos or icons) with a servings stepper that scales quantities. */
export function IngredientsSection({
  baseServings,
  initialServings,
  ingredients,
  editableRolesFor,
}: {
  baseServings: number;
  initialServings: number;
  ingredients: IngredientLine[];
  /** Recipe id when the household imported it and may fix protagonist/garnish roles. */
  editableRolesFor?: string;
}) {
  const [servings, setServings] = useState(initialServings);
  const factor = servings / Math.max(baseServings, 1);

  return (
    <section className="flex flex-col">
      <div className="flex items-center justify-between pb-2">
        <h2 className="font-condensed text-[30px] font-extrabold leading-none">Ingredientes</h2>
        <div className="flex items-center gap-1" role="group" aria-label="Porciones">
          <button
            type="button"
            aria-label="Menos porciones"
            disabled={servings <= 1}
            onClick={() => setServings((s) => s - 1)}
            className="flex size-9 items-center justify-center text-ink disabled:text-ink-faint"
          >
            <Icon name="minus" size={18} />
          </button>
          <span className="min-w-24 text-center text-[15px] font-semibold tabular">
            {servings} {servings === 1 ? "porción" : "porciones"}
          </span>
          <button
            type="button"
            aria-label="Más porciones"
            disabled={servings >= 24}
            onClick={() => setServings((s) => s + 1)}
            className="flex size-9 items-center justify-center text-ink disabled:text-ink-faint"
          >
            <Icon name="add" size={18} />
          </button>
        </div>
      </div>
      <ul className="flex flex-col">
        {ingredients.map((item) => (
          <li key={item.position} className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0">
            <span className={cn("min-w-0 flex-1", item.removed && "text-ink-faint line-through")}>
              <span className="block text-[17px] font-medium">{item.name}</span>
              {item.note ? <span className="block text-sm text-ink-muted">{item.note}</span> : null}
            </span>
            <span className={cn("text-[15px] tabular", item.removed ? "text-ink-faint" : "text-ink-muted")}>
              {formatQuantity(scale(item.quantity, factor), item.unit)}
            </span>
            {editableRolesFor ? (
              <IngredientRoleToggle recipeId={editableRolesFor} position={item.position} role={item.accessory ? "accessory" : "core"} />
            ) : item.accessory ? (
              <span className="text-xs text-ink-faint">adorno</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
