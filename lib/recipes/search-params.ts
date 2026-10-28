import { Constants, type Enums } from "@/lib/supabase/database.types";
import { parsePlanContext, planContextParam } from "@/lib/plan/search-context";
import { todayInBogota } from "@/lib/plan/week";

export type RecipeSearchFilters = {
  style?: Enums<"recipe_style">;
  meal?: Enums<"meal_type">;
  max?: number;
  video?: true;
};
export type RecipeSearch = RecipeSearchFilters & { q: string; plan?: string };

export function parseRecipeSearchParams(params: Record<string, string | string[] | undefined>, today = todayInBogota()): RecipeSearch {
  const result: RecipeSearch = { q: typeof params.q === "string" ? params.q.trim() : "" };
  const style = Constants.public.Enums.recipe_style.find((value) => value === params.style);
  const meal = Constants.public.Enums.meal_type.find((value) => value === params.meal);
  if (style) result.style = style;
  if (meal) result.meal = meal;
  if (typeof params.max === "string" && /^\d+$/.test(params.max)) {
    const max = Number(params.max);
    if (Number.isSafeInteger(max) && max > 0) result.max = max;
  }
  if (params.video === "1") result.video = true;
  const context = parsePlanContext(params.plan, today);
  if (context) result.plan = planContextParam(context);
  return result;
}

export function recipeSearchParams(search: RecipeSearch) {
  const params = new URLSearchParams();
  if (search.q) params.set("q", search.q);
  if (search.style) params.set("style", search.style);
  if (search.meal) params.set("meal", search.meal);
  if (search.max) params.set("max", String(search.max));
  if (search.video) params.set("video", "1");
  if (search.plan) params.set("plan", search.plan);
  return params;
}
