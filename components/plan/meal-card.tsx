import Link from "next/link";
import { RecipeThumb } from "@/components/recipes/recipe-thumb";
import { Avatar, type Accent } from "@/components/ui/avatar";
import type { PlanMealView } from "@/lib/plan/queries";
import { MEAL_TYPE_LABELS } from "@/lib/recipes/labels";
import { ReplaceButton } from "./replace-sheet";

const MEAL_EMOJI = { breakfast: "🍳", lunch: "🍲", dinner: "🌙" } as const;

export function MealCard({
  meal,
  members,
}: {
  meal: PlanMealView;
  members: { id: string; display_name: string; accent_color: Accent }[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        <span aria-hidden>{MEAL_EMOJI[meal.mealType]}</span>
        {MEAL_TYPE_LABELS[meal.mealType]}
        {meal.status === "cooked" ? <span className="rounded-full bg-savings-soft px-2 py-0.5 text-[10px] text-savings">Cocinada</span> : null}
      </h3>
      {meal.recipe ? (
        <div className="relative rounded-card bg-surface p-3 shadow-card">
          <Link href={`/recipes/${meal.recipe.id}?meal=${meal.id}`} className="flex items-center gap-3 pr-10">
            <RecipeThumb path={meal.recipe.coverPath} size={84} />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 font-display text-[16px] font-bold leading-snug">{meal.recipe.title}</span>
              <span className="mt-1 flex items-center gap-2 text-[13px] text-ink-muted tabular">
                {meal.recipe.minutes ? <span>⏱️ {meal.recipe.minutes} min</span> : null}
                {meal.recipe.kcal ? <span>🔥 {meal.recipe.kcal} kcal</span> : null}
                <span>🍽️ {meal.servings}</span>
              </span>
              <span className="mt-2 flex items-center gap-1">
                {members.map((m) => (
                  <span key={m.id} className="relative" title={m.display_name}>
                    <Avatar name={m.display_name} accent={m.accent_color} size={22} />
                    {meal.favorites[m.id] ? (
                      <span aria-label={`${m.display_name} la tiene en favoritos`} className="absolute -bottom-1 -right-1 text-[10px]">
                        ❤️
                      </span>
                    ) : null}
                  </span>
                ))}
              </span>
            </span>
          </Link>
          {meal.adjustments.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {meal.adjustments.map((a) => (
                <li key={a.ingredientId} className="rounded-full bg-teal-soft px-2.5 py-1 text-[12px] font-semibold text-teal">
                  Sin {a.ingredientName.toLowerCase()} · {a.memberNames.join(" y ")}
                  {a.substituteName ? ` → ${a.substituteName.toLowerCase()}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="absolute right-2 top-2">
            <ReplaceButton planMealId={meal.id} title={meal.recipe.title} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-card border-2 border-dashed border-line p-4">
          <p className="font-semibold">Sin opciones</p>
          <p className="text-sm text-ink-muted">{meal.emptyReason ?? "Aún no hay recetas para este momento."}</p>
          <Link href="/recipes/import" className="text-sm font-semibold text-brand">
            Importar una receta
          </Link>
        </div>
      )}
    </section>
  );
}
