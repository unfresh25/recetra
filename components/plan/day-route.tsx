import Link from "next/link";
import { RecipeThumb } from "@/components/recipes/recipe-thumb";
import { Avatar, type Accent } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import type { PlanMealView } from "@/lib/plan/queries";
import { MEAL_TYPE_LABELS } from "@/lib/recipes/labels";
import { cn } from "@/lib/utils/cn";
import { EatenToggle } from "./eaten-toggle";
import { ReplaceButton } from "./replace-sheet";

const STOP_ICON: Record<PlanMealView["mealType"], IconName> = { breakfast: "sunrise", lunch: "sun", dinner: "moon" };

/**
 * One day as a route (transit-style): each meal is a stop with an icon node, joined by a dashed
 * line; a vertical pill on the left shows the cooking time of that leg. Meals are stacked
 * Crouton-style: thumbnail + title + meta.
 */
export function DayRoute({
  meals,
  members,
  today,
}: {
  meals: PlanMealView[];
  members: { id: string; display_name: string; accent_color: Accent }[];
  today: string;
}) {
  return (
    <ol className="flex flex-col" aria-label="Comidas del día">
      {meals.map((meal, i) => {
        const last = i === meals.length - 1;
        const cooked = meal.status === "cooked";
        return (
          <li key={meal.id} className="grid grid-cols-[2.25rem_3rem_1fr] gap-x-2">
            {/* Leg pill: cooking time of this meal */}
            <div className="row-span-2 flex justify-center pt-14">
              {meal.recipe?.minutes ? (
                <span className="flex h-20 w-7 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand [writing-mode:vertical-rl] rotate-180 tabular">
                  {meal.recipe.minutes} min
                </span>
              ) : null}
            </div>

            {/* Stop node + route line */}
            <div className="row-span-2 flex flex-col items-center">
              <span
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-full text-white",
                  cooked ? "bg-savings" : meal.recipe ? "bg-brand" : "bg-ink-faint",
                )}
              >
                <Icon name={cooked ? "check" : STOP_ICON[meal.mealType]} size={22} strokeWidth={2} />
              </span>
              {!last ? (
                <span
                  aria-hidden
                  className="my-1 w-0 flex-1 border-l-[3px] border-dashed border-brand/45"
                />
              ) : null}
            </div>

            <p className="pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {MEAL_TYPE_LABELS[meal.mealType]}
              {cooked ? <span className="ml-2 text-savings">· Comida</span> : null}
            </p>

            <div className={cn("min-w-0", last ? "pb-2" : "pb-8")}>
              {meal.recipe ? (
                <div className="flex items-start gap-3 pt-2">
                  <Link href={`/recipes/${meal.recipe.id}?meal=${meal.id}`} prefetch className="flex min-w-0 flex-1 gap-3">
                    <RecipeThumb path={meal.recipe.coverPath} size={64} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[17px] font-semibold leading-snug">{meal.recipe.title}</span>
                      <span className="mt-1 flex items-center gap-3 text-[13px] text-ink-muted tabular">
                        {meal.recipe.kcal ? (
                          <span className="flex items-center gap-1">
                            <Icon name="fire" size={14} /> {meal.recipe.kcal} kcal
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <Icon name="users" size={14} /> {meal.servings}
                        </span>
                        <span className="flex items-center gap-0.5">
                          {members
                            .filter((m) => meal.favorites[m.id])
                            .map((m) => (
                              <span key={m.id} className="relative" title={`${m.display_name} la tiene en favoritos`}>
                                <Avatar name={m.display_name} accent={m.accent_color} size={18} />
                              </span>
                            ))}
                          {members.some((m) => meal.favorites[m.id]) ? <Icon name="heart" size={13} className="text-brand" /> : null}
                        </span>
                      </span>
                    </span>
                  </Link>
                  <ReplaceButton planMealId={meal.id} title={meal.recipe.title} />
                </div>
              ) : (
                <div className="flex flex-col gap-1 pt-2">
                  <p className="font-semibold">Sin opciones</p>
                  <p className="text-sm text-ink-muted">{meal.emptyReason ?? "Aún no hay recetas para este momento."}</p>
                  <Link href="/recipes/import" className="text-sm font-semibold text-brand">
                    Importar una receta
                  </Link>
                </div>
              )}
              {meal.recipe && meal.day <= today ? <EatenToggle planMealId={meal.id} eaten={cooked} /> : null}
              {meal.adjustments.length ? (
                <p className="mt-2 text-[13px] text-teal">
                  {meal.adjustments
                    .map(
                      (a) =>
                        `Sin ${a.ingredientName.toLowerCase()} (${a.memberNames.join(" y ")})${a.substituteName ? ` → ${a.substituteName.toLowerCase()}` : ""}`,
                    )
                    .join(" · ")}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
