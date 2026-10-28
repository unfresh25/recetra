import Image from "next/image";
import Link from "next/link";
import { Avatar, type Accent } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import type { PlanMealView } from "@/lib/plan/queries";
import type { MealType } from "@/lib/plan/types";
import { dayLabel, dayOfMonth } from "@/lib/plan/week";
import { recipeImageUrl } from "@/lib/recipes/images";
import { MEAL_TYPE_LABELS } from "@/lib/recipes/labels";
import { MealOptions } from "./meal-options";

const CARD = "relative flex min-h-[310px] w-[250px] shrink-0 snap-start flex-col rounded-[24px] p-4";
const LABEL = "text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted";
const VERBS = { breakfast: "desayunar", lunch: "almorzar", dinner: "cenar" };

export function MealCard({ meal, day, mealType, members, today, readOnly }: {
  meal?: PlanMealView;
  day: string;
  mealType: MealType;
  members: { id: string; display_name: string; accent_color: Accent }[];
  today: string;
  readOnly: boolean;
}) {
  if (!meal?.recipe) {
    const content = <>
      <span className={LABEL}>{MEAL_TYPE_LABELS[mealType]}</span>
      {!readOnly && day >= today ? <>
        <span className="my-5 flex size-12 items-center justify-center rounded-full bg-surface"><Icon name="add" size={24} /></span>
        <span className="font-display text-[19px]">Agregar receta</span>
        <span className="mt-2 max-w-44 text-[12px] leading-relaxed text-ink-muted">Busca y elige qué {VERBS[mealType]} este día</span>
      </> : <span className="mt-6 font-display text-[19px] text-ink-faint">Sin receta</span>}
    </>;
    const actionable = !readOnly && day >= today;
    const className = `${CARD} items-center justify-center text-center ${actionable ? "border-[1.5px] border-dashed border-ink-faint/40" : "text-ink-faint"}`;
    return <li>{actionable ? <Link href={`/search?plan=${day}.${mealType}&meal=${mealType}`} aria-label={`Agregar ${MEAL_TYPE_LABELS[mealType].toLowerCase()} el ${dayLabel(day, "long").toLowerCase()} ${dayOfMonth(day)}`} className={`link-tile ${className}`}>{content}</Link> : <div className={className}>{content}</div>}</li>;
  }
  const { recipe } = meal;
  const src = recipeImageUrl(recipe.coverPath);
  return <li className={`${CARD} bg-sunken`}>
    <Link href={`/recipes/${recipe.id}?meal=${meal.id}`} className="link-tile flex flex-1 flex-col gap-3 after:absolute after:inset-0 after:rounded-[24px]">
      <span className={LABEL}>{MEAL_TYPE_LABELS[mealType]}</span>
      <span className="line-clamp-2 min-h-[46px] font-display text-[19px] leading-[23px]">{recipe.title}</span>
      <span className="relative min-h-32 flex-1 overflow-hidden rounded-2xl">
        {src ? <Image src={src} alt="" fill sizes="218px" className="object-cover" unoptimized /> : <span className="flex h-full min-h-32 items-center justify-center text-ink-faint"><Icon name="pot" size={36} /></span>}
        {meal.status === "cooked" ? <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-canvas px-2 py-1 text-[10px]"><Icon name="check" size={12} /> Comida</span> : null}
      </span>
      {meal.adjustments.length ? <span className="text-[11px] leading-snug text-teal">{meal.adjustments.map((a) => `Sin ${a.ingredientName.toLowerCase()} (${a.memberNames.join(" y ")})${a.substituteName ? ` → ${a.substituteName.toLowerCase()}` : ""}`).join(" · ")}</span> : null}
      <span className="flex min-h-9 items-center gap-2 pr-8 text-[11px] text-ink-muted tabular">
        <span>{recipe.minutes !== null ? `${recipe.minutes} min` : "— min"} · {recipe.kcal !== null ? `${recipe.kcal} kcal` : "— kcal"}</span>
        <span className="flex -space-x-1">{members.filter((m) => meal.favorites[m.id]).map((m) => <span key={m.id} title={`${m.display_name} la tiene en favoritos`}><Avatar name={m.display_name} accent={m.accent_color} size={18} /></span>)}</span>
      </span>
    </Link>
    {!readOnly || day <= today ? <div className="absolute right-3 bottom-4 z-10"><MealOptions meal={meal} today={today} readOnly={readOnly} /></div> : null}
  </li>;
}
