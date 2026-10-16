import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Adjustment } from "./types";

export type PlanMealView = {
  id: string;
  day: string;
  mealType: "breakfast" | "lunch" | "dinner";
  status: "planned" | "cooked" | "replaced";
  servings: number;
  recipe: {
    id: string;
    title: string;
    minutes: number | null;
    kcal: number | null;
    coverPath: string | null;
    authorName: string | null;
  } | null;
  adjustments: Adjustment[];
  emptyReason: string | null;
  /** memberId -> favorite? */
  favorites: Record<string, boolean>;
};

export async function getWeekPlan(householdId: string, weekStart: string) {
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("meal_plans")
    .select("id, generated_at")
    .eq("household_id", householdId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (!plan) return null;

  const [{ data: meals }, { data: overrides }, { data: members }] = await Promise.all([
    supabase
      .from("plan_meals")
      .select(
        "id, day, meal_type, status, servings, adjustments, recipes (id, title, total_minutes, kcal_per_serving, source_image_path, author_name)",
      )
      .eq("meal_plan_id", plan.id)
      .order("day"),
    supabase.from("household_recipe_overrides").select("recipe_id, cover_image_path"),
    supabase.from("members").select("id, display_name, accent_color").order("created_at"),
  ]);
  const recipeIds = (meals ?? []).flatMap((m) => (m.recipes ? [m.recipes.id] : []));
  const { data: favorites } = recipeIds.length
    ? await supabase.from("reactions").select("member_id, recipe_id").eq("kind", "favorite").in("recipe_id", recipeIds)
    : { data: [] };

  const covers = new Map((overrides ?? []).map((o) => [o.recipe_id, o.cover_image_path]));
  const order = { breakfast: 0, lunch: 1, dinner: 2 } as const;

  const views: PlanMealView[] = (meals ?? [])
    .map((m) => {
      const adj = (m.adjustments ?? {}) as { removed?: Adjustment[]; empty_reason?: string };
      const r = m.recipes;
      return {
        id: m.id,
        day: m.day,
        mealType: m.meal_type,
        status: m.status,
        servings: m.servings,
        recipe: r
          ? {
              id: r.id,
              title: r.title,
              minutes: r.total_minutes,
              kcal: r.kcal_per_serving,
              coverPath: covers.get(r.id) ?? r.source_image_path,
              authorName: r.author_name,
            }
          : null,
        adjustments: adj.removed ?? [],
        emptyReason: adj.empty_reason ?? null,
        favorites: Object.fromEntries(
          (favorites ?? []).filter((f) => r && f.recipe_id === r.id).map((f) => [f.member_id, true]),
        ),
      };
    })
    .sort((a, b) => a.day.localeCompare(b.day) || order[a.mealType] - order[b.mealType]);

  return { planId: plan.id, meals: views, members: members ?? [] };
}
