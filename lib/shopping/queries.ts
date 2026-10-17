import "server-only";
import { privateData } from "@/lib/cache";
import type { Adjustment } from "@/lib/plan/types";
import { mondayOf, todayInBogota } from "@/lib/plan/week";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { planShopping, type Need, type Offer } from "./list";
import { toBuyAmount, type IngredientUnits } from "./units";

export type PendingMatch = { matchId: string; ingredientId: string; ingredientName: string; offer: Offer };

export type ShoppingStore = { id: string; slug: string; name: string; logo_url: string | null; brand_color: string };

// Stores we can read prices from. Ara and Isimo have no online shop; Makro and Jumbo are not wired yet.
const PRICED_SOURCES = new Set(["vtex"]);
const UNPRICED_SLUGS = new Set(["jumbo"]);
// "Ajo X KG", "Tomate Chonto Kilo", "Pechuga x Kg": loose goods weighed at the counter.
const PER_KILO = /\b(x\s*kg|x\s*kilo|kilo|por kilo)\b|\bkg\s*$/i;

const INGREDIENT_FIELDS = "id, name, category, base_unit, purchase_unit, unit_weight_g, density_g_ml, pantry_staple";

/** Shopping list for what is still to cook this week (today onward), priced at the household's stores. */
export async function getShoppingPlan(householdId: string) {
  "use cache: private";
  privateData();
  return buildShoppingPlan(await createClient({ privateCache: true }), householdId, todayInBogota());
}

/** Uncached core, also used by scripts with the service-role client. */
export async function buildShoppingPlan(supabase: SupabaseClient<Database>, householdId: string, today: string) {
  const [{ data: plan }, { data: storeRows }, { data: pinnedRows }] = await Promise.all([
    supabase.from("meal_plans").select("id").eq("household_id", householdId).eq("week_start", mondayOf(today)).maybeSingle(),
    supabase.from("household_stores").select("stores (id, slug, name, logo_url, brand_color, sort_order, source)").eq("household_id", householdId),
    supabase.from("pinned_brands").select("ingredient_id, brand").eq("household_id", householdId),
  ]);
  const allStores = (storeRows ?? []).flatMap((r) => (r.stores ? [r.stores] : [])).sort((a, b) => a.sort_order - b.sort_order);
  const toView = (s: (typeof allStores)[number]): ShoppingStore => ({ id: s.id, slug: s.slug, name: s.name, logo_url: s.logo_url, brand_color: s.brand_color });
  const isPriced = (s: (typeof allStores)[number]) => PRICED_SOURCES.has(s.source) && !UNPRICED_SLUGS.has(s.slug);
  const stores = allStores.filter(isPriced).map(toView);
  const unpricedStores = allStores.filter((s) => !isPriced(s)).map((s) => s.name);
  if (!plan) return { hasPlan: false as const, stores, unpricedStores };

  const { data: meals } = await supabase
    .from("plan_meals")
    .select("servings, adjustments, recipes (id, title, servings, recipe_ingredients (ingredient_id, quantity, unit, ingredients (" + INGREDIENT_FIELDS + ")))")
    .eq("meal_plan_id", plan.id)
    .eq("status", "planned")
    .gte("day", today)
    .not("recipe_id", "is", null);

  type IngredientRow = { id: string; name: string; category: string; base_unit: "g" | "ml" | "unit"; purchase_unit: "g" | "ml" | "unit" | null; unit_weight_g: number | null; density_g_ml: number | null; pantry_staple: boolean };
  type MealRow = {
    servings: number;
    adjustments: { removed?: Adjustment[] } | null;
    recipes: { id: string; title: string; servings: number; recipe_ingredients: { ingredient_id: string; quantity: number | null; unit: string | null; ingredients: IngredientRow | null }[] } | null;
  };
  const rows = (meals ?? []) as unknown as MealRow[];

  // Substitutes are stored by name ("Perejil"); resolve them to catalog ingredients.
  const substituteNames = [...new Set(rows.flatMap((m) => (m.adjustments?.removed ?? []).flatMap((a) => (a.substituteName ? [a.substituteName] : []))))];
  const { data: substitutes } = substituteNames.length
    ? await supabase.from("ingredients").select(INGREDIENT_FIELDS).in("name", substituteNames)
    : { data: [] as IngredientRow[] };
  const substituteByName = new Map(((substitutes ?? []) as IngredientRow[]).map((s) => [s.name, s]));

  const needs = new Map<string, Need & { measured: boolean }>();
  function add(ingredient: IngredientRow, quantity: number | null, unit: string | null, scale: number, recipe: string) {
    const units: IngredientUnits = ingredient;
    const amount = quantity != null ? toBuyAmount(quantity * scale, unit, units) : null;
    const target = ingredient.purchase_unit ?? ingredient.base_unit;
    const need = needs.get(ingredient.id) ?? {
      ingredientId: ingredient.id, name: ingredient.name, category: ingredient.category, staple: ingredient.pantry_staple,
      amount: null, unit: target, units, recipes: [], measured: false,
    };
    if (amount) {
      need.amount = (need.amount ?? 0) + amount.amount;
      need.measured = true;
    }
    if (!need.recipes.includes(recipe)) need.recipes.push(recipe);
    needs.set(ingredient.id, need);
  }

  for (const meal of rows) {
    const recipe = meal.recipes;
    if (!recipe) continue;
    const scale = meal.servings / Math.max(recipe.servings, 1);
    const removed = new Map((meal.adjustments?.removed ?? []).map((a) => [a.ingredientId, a]));
    for (const line of recipe.recipe_ingredients) {
      if (!line.ingredients) continue;
      const adjustment = removed.get(line.ingredient_id);
      if (!adjustment) add(line.ingredients, line.quantity, line.unit, scale, recipe.title);
      else if (adjustment.substituteName && substituteByName.has(adjustment.substituteName))
        add(substituteByName.get(adjustment.substituteName)!, line.quantity, line.unit, scale, recipe.title);
    }
  }

  const ingredientIds = [...needs.keys()];
  const storeIds = stores.map((s) => s.id);
  const offers = new Map<string, Offer[]>();
  const pending: PendingMatch[] = [];
  if (ingredientIds.length && storeIds.length) {
    const { data: matches } = await supabase
      .from("product_matches")
      .select("id, ingredient_id, status, products!inner (id, store_id, name, brand, package_qty, package_unit, url, available)")
      .in("ingredient_id", ingredientIds)
      .in("status", ["auto", "confirmed", "pending_review"])
      .in("products.store_id", storeIds)
      .eq("products.available", true);
    const productIds = [...new Set((matches ?? []).map((m) => m.products.id))];
    const prices = new Map<string, { price_cop: number; captured_at: string }>();
    for (let i = 0; i < productIds.length; i += 200) {
      const { data } = await supabase.from("current_prices").select("product_id, price_cop, captured_at").in("product_id", productIds.slice(i, i + 200));
      for (const p of data ?? []) if (p.product_id && p.price_cop && p.captured_at) prices.set(p.product_id, { price_cop: p.price_cop, captured_at: p.captured_at });
    }
    for (const m of matches ?? []) {
      const price = prices.get(m.products.id);
      if (!price) continue;
      const offer: Offer = {
        storeId: m.products.store_id, productId: m.products.id, name: m.products.name, brand: m.products.brand,
        packageQty: Number(m.products.package_qty), packageUnit: m.products.package_unit, priceCop: price.price_cop,
        capturedAt: price.captured_at, url: m.products.url,
        byWeight: m.products.package_unit === "g" && Number(m.products.package_qty) === 1000 && PER_KILO.test(m.products.name),
      };
      // Low-confidence matches wait for a person; until then they don't price anything.
      if (m.status === "pending_review") {
        pending.push({ matchId: m.id, ingredientId: m.ingredient_id, ingredientName: needs.get(m.ingredient_id)?.name ?? "", offer });
        continue;
      }
      offers.set(m.ingredient_id, [...(offers.get(m.ingredient_id) ?? []), offer]);
    }
  }

  const pinned = new Map((pinnedRows ?? []).map((p) => [p.ingredient_id, p.brand]));
  const list = [...needs.values()].map(({ measured, ...need }) => ({ ...need, amount: measured ? need.amount : null }));
  const staples = new Set(list.filter((n) => n.staple).map((n) => n.ingredientId));
  return {
    hasPlan: true as const,
    stores,
    unpricedStores,
    pending: pending.filter((p) => !staples.has(p.ingredientId)),
    ...planShopping(list, offers, storeIds, pinned),
  };
}
