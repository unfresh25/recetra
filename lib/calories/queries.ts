import "server-only";
import { privateData } from "@/lib/cache";
import { mondayOf, todayInBogota, weekDays } from "@/lib/plan/week";
import { createClient } from "@/lib/supabase/server";
import type { CalorieMeal } from "./summary";

/** The week around `requestedDay` with every planned meal and whether it was eaten. */
export async function getCalorieWeek(householdId: string, requestedDay: string | null) {
  "use cache: private";
  privateData();
  const today = todayInBogota();
  const day = requestedDay ?? today;
  const days = weekDays(mondayOf(day));
  const supabase = await createClient({ privateCache: true });
  const { data: plan } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("household_id", householdId)
    .eq("week_start", days[0]!)
    .maybeSingle();
  const { data: rows } = plan
    ? await supabase
        .from("plan_meals")
        .select("id, day, meal_type, status, recipes (title, kcal_per_serving, protein_g, carbs_g, fat_g)")
        .eq("meal_plan_id", plan.id)
        .not("recipe_id", "is", null)
    : { data: [] };
  const order = { breakfast: 0, lunch: 1, dinner: 2 } as const;
  const meals: CalorieMeal[] = (rows ?? [])
    .flatMap((r) =>
      r.recipes
        ? [{
            id: r.id, day: r.day, mealType: r.meal_type, eaten: r.status === "cooked", title: r.recipes.title,
            kcal: r.recipes.kcal_per_serving, protein: r.recipes.protein_g, carbs: r.recipes.carbs_g, fat: r.recipes.fat_g,
          }]
        : [],
    )
    .sort((a, b) => a.day.localeCompare(b.day) || order[a.mealType] - order[b.mealType]);
  return { today, days, selected: days.includes(day) ? day : days[0]!, meals };
}
