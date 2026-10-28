import "server-only";
import { privateData } from "@/lib/cache";
import { createClient } from "@/lib/supabase/server";
import type { Adjustment } from "./types";
import { addDays, mondayOf, todayInBogota, weekDays } from "./week";
import type { PlacementWeek } from "./placement";

/** Both placement weeks are available, even before their first recipe is added. */
export async function getPlacementWeeks(householdId: string, today: string): Promise<PlacementWeek[]> {
  "use cache: private";
  privateData();
  const supabase = await createClient({ privateCache: true });
  const monday = mondayOf(today);
  const { data, error } = await supabase.from("meal_plans")
    .select("week_start, plan_meals (day, meal_type, recipes (title))")
    .eq("household_id", householdId)
    .in("week_start", [monday, addDays(monday, 7)])
    .order("week_start");
  if (error) throw error;
  return [monday, addDays(monday, 7)].map((weekStart) => ({
    weekStart,
    slots: (data.find((week) => week.week_start === weekStart)?.plan_meals ?? []).map((meal) => ({ day: meal.day, mealType: meal.meal_type, title: meal.recipes?.title ?? null })),
  }));
}

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
  "use cache: private";
  privateData();
  const supabase = await createClient({ privateCache: true });
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

/** Only recorded past weeks and the two editable weeks can be selected. */
export async function getPlanView(householdId: string, requestedDay: string | null) {
  "use cache: private";
  privateData();
  const today = todayInBogota();
  const monday = mondayOf(today);
  const supabase = await createClient({ privateCache: true });
  const { data: past, error } = await supabase.from("meal_plans").select("week_start")
    .eq("household_id", householdId).gte("week_start", addDays(monday, -56)).lt("week_start", monday).order("week_start");
  if (error) throw error;
  const tabs = [...(past ?? []).map((plan) => plan.week_start), monday, addDays(monday, 7)];
  const requestedWeek = requestedDay ? mondayOf(requestedDay) : monday;
  const weekStart = tabs.includes(requestedWeek) ? requestedWeek : monday;
  const days = weekDays(weekStart);
  const week = await getWeekPlan(householdId, weekStart);
  return { today, weekStart, days, week, tabs };
}
