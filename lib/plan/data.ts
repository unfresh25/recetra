import "server-only";
import type { Membership } from "@/lib/auth";
import { householdPortions } from "@/lib/household/portions";
import { createClient } from "@/lib/supabase/server";
import { daysSinceCooked, summarizeReactions, type ReactionRow } from "./reactions";
import type { Candidate, MealType, MemberProfile, PlanContext } from "./types";

/** Everything the engine needs, read with the household's own permissions (RLS). */
export async function loadPlanInputs(membership: Membership, weekStart: string, seed: number, { privateCache = false }: { privateCache?: boolean } = {}) {
  const supabase = await createClient({ privateCache });
  const { household } = membership;

  async function readAll<T>(page: (offset: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; ; offset += 1000) {
      const result = await page(offset);
      if (result.error) throw result.error;
      const batch = result.data ?? [];
      rows.push(...batch);
      if (batch.length < 1000) return rows;
    }
  }

  const [recipes, membersResult, restrictions, reactions, learnedResult] = await Promise.all([
    readAll((offset) => supabase.from("recipes").select(
      "id, title, author_name, source_platform, source_video_id, source_image_path, visibility, created_at, kcal_per_serving, meal_types, total_minutes, styles, equipment, recipe_ingredients (role, substitute_ids, ingredients (id, slug, name, category, allergens))",
    ).eq("status", "approved").order("id").range(offset, offset + 999)),
    supabase.from("members").select("id, display_name"),
    readAll((offset) => supabase.from("restrictions").select("member_id, kind, allergen, ingredient_id, ingredient_category, diet").order("id").range(offset, offset + 999)),
    readAll((offset) => supabase.from("reactions").select("member_id, recipe_id, kind, reason, created_at").order("id").range(offset, offset + 999)),
    supabase.from("household_learned_prefs").select("max_minutes_by_meal_type, price_sensitivity").maybeSingle(),
  ]);

  for (const result of [membersResult, learnedResult]) {
    if (result.error) throw result.error;
  }
  const members = membersResult.data;
  const learned = learnedResult.data;

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

  return { recipes, candidates, ctx, servings: householdPortions({ adults: household.servings_adults, kids: household.servings_kids }) };
}
