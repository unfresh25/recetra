import "server-only";
import type { Membership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { daysSinceCooked, summarizeReactions, type ReactionRow } from "./reactions";
import type { Candidate, MealType, MemberProfile, PlanContext } from "./types";

/** Everything the engine needs, read with the household's own permissions (RLS). */
export async function loadPlanInputs(membership: Membership, weekStart: string, seed: number) {
  const supabase = await createClient();
  const { household } = membership;

  const [{ data: recipes }, { data: members }, { data: restrictions }, { data: reactions }, { data: learned }] = await Promise.all([
    supabase
      .from("recipes")
      .select(
        "id, title, meal_types, total_minutes, styles, equipment, recipe_ingredients (role, substitute_ids, ingredients (id, slug, name, category, allergens))",
      )
      .eq("status", "approved"),
    supabase.from("members").select("id, display_name"),
    supabase.from("restrictions").select("member_id, kind, allergen, ingredient_id, ingredient_category, diet"),
    supabase.from("reactions").select("member_id, recipe_id, kind, reason, created_at"),
    supabase.from("household_learned_prefs").select("max_minutes_by_meal_type, price_sensitivity").maybeSingle(),
  ]);

  const candidates: Candidate[] = (recipes ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    mealTypes: r.meal_types,
    minutes: r.total_minutes,
    styles: r.styles,
    equipment: r.equipment,
    estimatedCost: null,
    ingredients: r.recipe_ingredients.flatMap((ri) =>
      ri.ingredients
        ? [
            {
              ingredientId: ri.ingredients.id,
              name: ri.ingredients.name,
              slug: ri.ingredients.slug,
              category: ri.ingredients.category,
              allergens: ri.ingredients.allergens,
              role: ri.role,
              substituteIds: ri.substitute_ids,
            },
          ]
        : [],
    ),
  }));

  const rows = restrictions ?? [];
  const profiles: MemberProfile[] = (members ?? []).map((m) => {
    const mine = rows.filter((r) => r.member_id === m.id);
    return {
      id: m.id,
      name: m.display_name,
      allergies: mine.flatMap((r) => (r.allergen ? [r.allergen] : [])),
      dislikeIngredientIds: mine.flatMap((r) => (r.kind === "dislike" && r.ingredient_id ? [r.ingredient_id] : [])),
      dislikeCategories: mine.flatMap((r) => (r.kind === "dislike" && r.ingredient_category ? [r.ingredient_category] : [])),
      diets: mine.flatMap((r) => (r.diet ? [r.diet] : [])),
    };
  });

  const reactionRows = (reactions ?? []) as ReactionRow[];
  const ctx: PlanContext = {
    weekStart,
    members: profiles,
    // A stovetop is assumed; everything else must be declared.
    equipment: [...new Set([...household.equipment, "stovetop" as const])],
    styles: household.styles,
    weeklyBudget: household.weekly_budget_cop,
    priceSensitivity: learned?.price_sensitivity ?? 0.5,
    maxMinutesByMeal: (learned?.max_minutes_by_meal_type ?? {}) as Partial<Record<MealType, number>>,
    reactions: summarizeReactions(reactionRows),
    daysSinceCooked: daysSinceCooked(reactionRows),
    seed,
  };

  return { candidates, ctx, servings: household.servings_adults + household.servings_kids };
}
