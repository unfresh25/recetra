import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getRecipe(recipeId: string, householdId: string) {
  const supabase = await createClient();
  const [{ data: recipe }, { data: ingredients }, { data: steps }, { data: override }] = await Promise.all([
    supabase.from("recipes").select("*").eq("id", recipeId).maybeSingle(),
    supabase
      .from("recipe_ingredients")
      .select("position, quantity, unit, role, note, substitute_ids, ingredients (id, slug, name, category, allergens)")
      .eq("recipe_id", recipeId)
      .order("position"),
    supabase.from("recipe_steps").select("position, text, video_start_seconds").eq("recipe_id", recipeId).order("position"),
    supabase
      .from("household_recipe_overrides")
      .select("cover_image_path")
      .eq("recipe_id", recipeId)
      .eq("household_id", householdId)
      .maybeSingle(),
  ]);
  if (!recipe) return null;
  return {
    recipe,
    ingredients: ingredients ?? [],
    steps: steps ?? [],
    coverPath: override?.cover_image_path ?? recipe.source_image_path,
    hasCustomCover: Boolean(override?.cover_image_path),
  };
}

export type RecipeDetail = NonNullable<Awaited<ReturnType<typeof getRecipe>>>;

/** Recipes this household imported (any status except rejected), newest first. */
export async function listHouseholdImports(householdId: string) {
  const supabase = await createClient();
  const [{ data: recipes }, { data: overrides }] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, title, author_name, source_platform, source_image_path, total_minutes, meal_types, status")
      .eq("imported_by_household_id", householdId)
      .neq("status", "rejected")
      .order("created_at", { ascending: false }),
    supabase.from("household_recipe_overrides").select("recipe_id, cover_image_path"),
  ]);
  const covers = new Map((overrides ?? []).map((o) => [o.recipe_id, o.cover_image_path]));
  return (recipes ?? []).map((r) => ({ ...r, coverPath: covers.get(r.id) ?? r.source_image_path }));
}

/** Everything waiting for the household in the "por confirmar" inbox. */
export async function getInbox(householdId: string) {
  const supabase = await createClient();
  const [{ data: jobs }, { data: drafts }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, status, payload, result, created_at")
      .eq("household_id", householdId)
      .eq("kind", "import_recipe")
      .neq("status", "done")
      .order("created_at", { ascending: false }),
    supabase
      .from("recipes")
      .select("id, title, author_name, source_platform, source_image_path, meal_types, ai_confidence, created_at")
      .eq("imported_by_household_id", householdId)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false }),
  ]);
  return { jobs: jobs ?? [], drafts: drafts ?? [] };
}

export async function countInbox(householdId: string) {
  const supabase = await createClient();
  const [{ count: jobs }, { count: drafts }] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("household_id", householdId).neq("status", "done"),
    supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("imported_by_household_id", householdId)
      .eq("status", "pending_review"),
  ]);
  return (jobs ?? 0) + (drafts ?? 0);
}

/** The member's own reactions to a recipe and whether their partner favorited it. */
export async function getRecipeSocial(recipeId: string, memberId: string) {
  const supabase = await createClient();
  const [{ data: reactions }, { data: members }] = await Promise.all([
    supabase.from("reactions").select("member_id, kind").eq("recipe_id", recipeId).in("kind", ["favorite", "dislike", "veto"]),
    supabase.from("members").select("id, display_name, accent_color"),
  ]);
  const rows = reactions ?? [];
  const has = (member: string, kind: string) => rows.some((r) => r.member_id === member && r.kind === kind);
  const partner = (members ?? []).find((m) => m.id !== memberId);
  return {
    mine: { favorite: has(memberId, "favorite"), dislike: has(memberId, "dislike"), veto: has(memberId, "veto") },
    partner: partner ? { name: partner.display_name, accent: partner.accent_color, favorite: has(partner.id, "favorite") } : null,
  };
}

export async function getPlanMealAdjustments(planMealId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("plan_meals").select("adjustments").eq("id", planMealId).maybeSingle();
  const adjustments = (data?.adjustments ?? {}) as { removed?: import("@/lib/plan/types").Adjustment[] };
  return { removed: adjustments.removed ?? [] };
}

/** Favorites of the household, tagged with who favorited each one. */
export async function listFavorites() {
  const supabase = await createClient();
  const [{ data: favs }, { data: overrides }] = await Promise.all([
    supabase
      .from("reactions")
      .select("member_id, recipes (id, title, author_name, source_platform, source_image_path, total_minutes, meal_types, status)")
      .eq("kind", "favorite"),
    supabase.from("household_recipe_overrides").select("recipe_id, cover_image_path"),
  ]);
  const covers = new Map((overrides ?? []).map((o) => [o.recipe_id, o.cover_image_path]));
  const byRecipe = new Map<string, { recipe: NonNullable<NonNullable<typeof favs>[number]["recipes"]>; memberIds: Set<string> }>();
  for (const f of favs ?? []) {
    if (!f.recipes) continue;
    const entry = byRecipe.get(f.recipes.id) ?? { recipe: f.recipes, memberIds: new Set<string>() };
    entry.memberIds.add(f.member_id);
    byRecipe.set(f.recipes.id, entry);
  }
  return [...byRecipe.values()].map(({ recipe, memberIds }) => ({
    ...recipe,
    coverPath: covers.get(recipe.id) ?? recipe.source_image_path,
    memberIds: [...memberIds],
  }));
}
