import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { MEAL_TYPE_LABELS } from "@/lib/recipes/labels";
import type { Enums } from "@/lib/supabase/database.types";
import { PlatformIcon } from "./platform-icon";
import { RecipeThumb } from "./recipe-thumb";

export function RecipeCard({
  recipe,
}: {
  recipe: {
    id: string;
    title: string;
    author_name: string | null;
    source_platform: Enums<"source_platform">;
    coverPath: string | null;
    total_minutes: number | null;
    meal_types: Enums<"meal_type">[];
    status: Enums<"recipe_status">;
  };
}) {
  return (
    <Link href={`/recipes/${recipe.id}`} className="link-tile flex items-center gap-4 py-3">
      <RecipeThumb path={recipe.coverPath} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-display text-[16px] font-bold leading-snug">{recipe.title}</span>
        <span className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-muted">
          <PlatformIcon platform={recipe.source_platform} size={14} />
          <span className="truncate">{recipe.author_name ?? "Receta"}</span>
          {recipe.total_minutes ? (
            <>
              <span aria-hidden>·</span>
              <span className="tabular">{recipe.total_minutes} min</span>
            </>
          ) : null}
        </span>
        <span className="mt-1.5 flex flex-wrap gap-1">
          {recipe.status === "pending_review" ? (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">Por confirmar</span>
          ) : null}
          {recipe.meal_types.map((m) => (
            <span key={m} className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {MEAL_TYPE_LABELS[m]}
            </span>
          ))}
        </span>
      </span>
      <Icon name="arrow-right" size={18} className="text-ink-faint" />
    </Link>
  );
}
