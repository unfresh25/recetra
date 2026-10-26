"use client";

import { formatQuantity } from "@/lib/recipes/labels";
import { cn } from "@/lib/utils/cn";
import { IngredientRoleToggle } from "./ingredient-role-toggle";
import { useServings } from "./servings";

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

/** Quantities and the heading use the servings selected in the bottom bar. */
export function IngredientsSection({
  baseServings,
  ingredients,
  editableRolesFor,
}: {
  baseServings: number;
  ingredients: IngredientLine[];
  /** Recipe id when the household imported it and may fix protagonist/garnish roles. */
  editableRolesFor?: string;
}) {
  const { servings } = useServings();
  const factor = servings / Math.max(baseServings, 1);

  return (
    <section className="flex flex-col">
      <div className="flex items-center justify-between pb-2">
        <h2 className="font-display text-[22px]">Ingredientes</h2>
        <span className="rounded-full border border-line px-3 py-2 font-display text-xs tabular">Para {servings} {servings === 1 ? "porción" : "porciones"}</span>
      </div>
      {[false, true].map((accessory) => {
        const group = ingredients.filter((item) => item.accessory === accessory);
        if (!group.length) return null;
        return (
          <div key={String(accessory)}>
            {accessory ? <h3 className="pt-5 pb-1 text-[11px] font-bold tracking-[0.14em] text-ink-muted">OPCIONAL</h3> : null}
            <ul className="flex flex-col">
              {group.map((item) => (
                <li key={item.position} className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className={cn(item.removed && "text-ink-faint line-through")}>
                      <span className="block font-display text-[15px]">{item.name}</span>
                      {item.note ? <span className="block text-xs text-ink-muted">{item.note}</span> : null}
                    </div>
                    {editableRolesFor ? (
                      <IngredientRoleToggle recipeId={editableRolesFor} position={item.position} role={item.accessory ? "accessory" : "core"} />
                    ) : null}
                  </div>
                  <span className={cn("shrink-0 text-right text-[14px] font-semibold tabular", item.removed && "text-ink-faint line-through")}>
                    {formatQuantity(scale(item.quantity, factor), item.unit)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
