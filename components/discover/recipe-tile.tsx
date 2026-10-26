import Link from "next/link";
import { LikeButton } from "@/components/recipes/like-button";
import { Icon } from "@/components/ui/icon";
import type { DiscoverRecipe } from "@/lib/discover/queries";
import { STYLE_OPTIONS, type RecipeStyle } from "@/lib/onboarding/options";
import { MEAL_TYPE_LABELS, PLATFORM_LABELS } from "@/lib/recipes/labels";
import { RecipePhoto } from "./recipe-photo";

export function RecipeTile({ recipe, layout = "rail", styles = [] }: { recipe: DiscoverRecipe; layout?: "rail" | "quick" | "grid" | "video"; styles?: RecipeStyle[] }) {
  const grid = layout === "grid" || layout === "video";
  const style = STYLE_OPTIONS.find((option) => styles.includes(option.value) && recipe.styles.includes(option.value));
  const meta = [recipe.total_minutes !== null ? `${recipe.total_minutes} min` : null, recipe.meal_types[0] ? MEAL_TYPE_LABELS[recipe.meal_types[0]] : null].filter(Boolean).join(" · ");
  return (
    <article>
      <div className="relative">
        <Link href={`/recipes/${recipe.id}`} aria-label={recipe.title} className="block">
          <RecipePhoto path={recipe.coverPath} sizes={grid ? "(max-width: 576px) calc((100vw - 56px) / 2), 260px" : "148px"} className={`${grid ? "h-[200px]" : layout === "quick" ? "h-[150px]" : "h-[186px]"} rounded-[18px]`} />
        </Link>
        {style ? <span className="pointer-events-none absolute top-2 left-2 max-w-[calc(100%-16px)] rounded-full bg-canvas/90 px-2 py-1 font-display text-[10px] leading-tight text-ink">{style.label}</span> : null}
        {layout === "video" ? (
          <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink/90 px-2 py-1.5 text-[10px] font-medium text-canvas">
            <Icon name="play" size={12} /> {PLATFORM_LABELS[recipe.source_platform]}
          </span>
        ) : null}
        <div className={`absolute right-2 ${grid ? "top-2" : "bottom-2"}`}><LikeButton recipeId={recipe.id} recipeTitle={recipe.title} likes={recipe.likes} likedByMe={recipe.likedByMe} /></div>
      </div>
      <Link href={`/recipes/${recipe.id}`} className="mt-2.5 block">
        <h3 className="line-clamp-2 font-display text-[14.5px] font-semibold leading-[1.3] text-ink">{recipe.title}</h3>
      </Link>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{meta}</p>
    </article>
  );
}
