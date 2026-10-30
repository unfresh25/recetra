import type { Adjustment } from "@/lib/plan/types";
import { toBuyAmount, type BuyUnit, type IngredientUnits } from "./units";

export type ShoppingSource = {
  planMealId: string;
  recipeId: string;
  title: string;
  day: string;
  mealType: "breakfast" | "lunch" | "dinner";
  coverPath: string | null;
  amount: number | null;
  unit: BuyUnit;
};

export type ShoppingIngredient = IngredientUnits & {
  id: string;
  name: string;
  category: string;
  pantry_staple: boolean;
};

export type ShoppingMeal = {
  id: string;
  day: string;
  meal_type: ShoppingSource["mealType"];
  servings: number;
  adjustments: { removed?: Adjustment[] } | null;
  recipes: {
    id: string;
    title: string;
    servings: number;
    source_image_path: string | null;
    recipe_ingredients: { ingredient_id: string; quantity: number | null; unit: string | null; ingredients: ShoppingIngredient | null }[];
  } | null;
};

/** Pure shopping math: what to buy for the week, where, and what it costs. */
export type Need = {
  ingredientId: string;
  name: string;
  category: string;
  staple: boolean;
  /** Null when no recipe gave a measurable amount ("al gusto"): one package is enough. */
  amount: number | null;
  unit: BuyUnit;
  units: IngredientUnits;
  recipes: string[];
  sources: ShoppingSource[];
};

/** Aggregate after adjustments, preserving each meal's scaled contribution in purchase units. */
export function aggregateNeeds(meals: ShoppingMeal[], substitutes = new Map<string, ShoppingIngredient>(), covers = new Map<string, string | null>()): Need[] {
  const needs = new Map<string, Need>();
  for (const meal of meals) {
    const recipe = meal.recipes;
    if (!recipe) continue;
    const scale = meal.servings / Math.max(recipe.servings, 1);
    const removed = new Map((meal.adjustments?.removed ?? []).map((a) => [a.ingredientId, a]));
    for (const line of recipe.recipe_ingredients) {
      const adjustment = removed.get(line.ingredient_id);
      const ingredient = adjustment ? (adjustment.substituteName ? substitutes.get(adjustment.substituteName) : null) : line.ingredients;
      if (!ingredient) continue;
      const amount = toBuyAmount(line.quantity == null ? null : line.quantity * scale, line.unit, ingredient);
      const unit = ingredient.purchase_unit ?? ingredient.base_unit;
      const need = needs.get(ingredient.id) ?? {
        ingredientId: ingredient.id, name: ingredient.name, category: ingredient.category, staple: ingredient.pantry_staple,
        amount: null, unit, units: ingredient, recipes: [], sources: [],
      };
      if (amount) need.amount = (need.amount ?? 0) + amount.amount;
      if (!need.recipes.includes(recipe.title)) need.recipes.push(recipe.title);
      const source = need.sources.find((s) => s.planMealId === meal.id);
      if (source) {
        if (amount) source.amount = (source.amount ?? 0) + amount.amount;
      } else {
        need.sources.push({
          planMealId: meal.id, recipeId: recipe.id, title: recipe.title, day: meal.day, mealType: meal.meal_type,
          coverPath: covers.get(recipe.id) ?? recipe.source_image_path, amount: amount?.amount ?? null, unit,
        });
      }
      needs.set(ingredient.id, need);
    }
  }
  return [...needs.values()];
}

export type Offer = {
  storeId: string;
  productId: string;
  name: string;
  brand: string | null;
  packageQty: number;
  packageUnit: BuyUnit;
  priceCop: number;
  capturedAt: string;
  url: string | null;
  /** Loose goods priced per kilo ("Tomate x Kg"): you pay for the weight you take. */
  byWeight?: boolean;
};

export type StorePick = { offer: Offer; packages: number; costCop: number; /** Grams to ask for, when sold by weight. */ weightG?: number };

const MIN_WEIGHED_G = 100;

export type ShoppingItem = Need & {
  picks: Record<string, StorePick | null>;
  cheapestStoreId: string | null;
  pinnedBrand: string | null;
};

export type StoreTotal = { storeIds: string[]; totalCop: number; missing: number };

export type ShoppingPlan = {
  items: ShoppingItem[];
  /** One total per household store. */
  perStore: StoreTotal[];
  bestSingle: StoreTotal | null;
  /** Cheapest way to cover the list using at most two stores; null if it doesn't beat bestSingle. */
  bestCombo: (StoreTotal & { assignment: Record<string, string> }) | null;
};

/** Converts between g, ml and pieces with the ingredient's density and piece weight. */
export function convert(amount: number, from: BuyUnit, to: BuyUnit, units: IngredientUnits): number | null {
  if (from === to) return amount;
  const density = units.density_g_ml ?? 1;
  const grams = from === "g" ? amount : from === "ml" ? amount * density : units.unit_weight_g ? amount * units.unit_weight_g : null;
  if (grams == null) return null;
  if (to === "g") return grams;
  if (to === "ml") return grams / density;
  return units.unit_weight_g ? grams / units.unit_weight_g : null;
}

export function pick(need: Need, offers: Offer[]): StorePick | null {
  let best: StorePick | null = null;
  for (const offer of offers) {
    if (offer.byWeight) {
      const grams = need.amount != null ? convert(need.amount, need.unit, "g", need.units) : MIN_WEIGHED_G;
      if (grams == null) continue;
      const weightG = Math.max(MIN_WEIGHED_G, Math.ceil(grams / 50) * 50);
      const costCop = Math.round((weightG / offer.packageQty) * offer.priceCop);
      if (!best || costCop < best.costCop) best = { offer, packages: 1, costCop, weightG };
      continue;
    }
    let packages = 1;
    if (need.amount != null) {
      const wanted = convert(need.amount, need.unit, offer.packageUnit, need.units);
      if (wanted == null) continue;
      // 3% slack: 1.02 kg of rice is still one 1 kg bag.
      packages = Math.max(1, Math.ceil(wanted / offer.packageQty - 0.03));
    }
    const costCop = packages * offer.priceCop;
    if (!best || costCop < best.costCop) best = { offer, packages, costCop };
  }
  return best;
}

function total(items: ShoppingItem[], choose: (item: ShoppingItem) => StorePick | null, storeIds: string[]): StoreTotal {
  let totalCop = 0;
  let missing = 0;
  for (const item of items) {
    const chosen = choose(item);
    if (chosen) totalCop += chosen.costCop;
    else missing++;
  }
  return { storeIds, totalCop, missing };
}

const better = (a: StoreTotal, b: StoreTotal) => a.missing < b.missing || (a.missing === b.missing && a.totalCop < b.totalCop);

/**
 * Staples (salt, oil, spices) are listed but not priced: they are assumed at home.
 * A pinned brand limits each store to that brand; a store without it counts as missing.
 */
export function planShopping(
  needs: Need[],
  offersByIngredient: Map<string, Offer[]>,
  storeIds: string[],
  pinned: Map<string, string> = new Map(),
): ShoppingPlan {
  const items: ShoppingItem[] = needs.map((need) => {
    const pinnedBrand = pinned.get(need.ingredientId) ?? null;
    const picks: Record<string, StorePick | null> = {};
    let cheapestStoreId: string | null = null;
    if (!need.staple) {
      const offers = (offersByIngredient.get(need.ingredientId) ?? []).filter(
        (o) => !pinnedBrand || o.brand?.toLocaleLowerCase("es") === pinnedBrand.toLocaleLowerCase("es"),
      );
      for (const storeId of storeIds) {
        picks[storeId] = pick(need, offers.filter((o) => o.storeId === storeId));
        const chosen = picks[storeId];
        if (chosen && (!cheapestStoreId || chosen.costCop < picks[cheapestStoreId]!.costCop)) cheapestStoreId = storeId;
      }
    }
    return { ...need, picks, cheapestStoreId, pinnedBrand };
  });

  const priced = items.filter((i) => !i.staple);
  const perStore = storeIds.map((id) => total(priced, (item) => item.picks[id] ?? null, [id]));
  const bestSingle = perStore.reduce<StoreTotal | null>((best, t) => (!best || better(t, best) ? t : best), null);

  let bestCombo: ShoppingPlan["bestCombo"] = null;
  for (let a = 0; a < storeIds.length; a++) {
    for (let b = a + 1; b < storeIds.length; b++) {
      const pair = [storeIds[a]!, storeIds[b]!];
      const assignment: Record<string, string> = {};
      const result = total(
        priced,
        (item) => {
          const [x, y] = pair.map((id) => item.picks[id] ?? null);
          const chosen = x && (!y || x.costCop <= y.costCop) ? x : y;
          if (chosen) assignment[item.ingredientId] = chosen.offer.storeId;
          return chosen;
        },
        pair,
      );
      if (!bestCombo || better(result, bestCombo)) bestCombo = { ...result, assignment };
    }
  }
  // Two stores only make sense if they cover more or save at least 3%.
  if (bestCombo && bestSingle && !(bestCombo.missing < bestSingle.missing || bestCombo.totalCop < bestSingle.totalCop * 0.97)) {
    bestCombo = null;
  }
  // Assign single-store items so "por tienda" groups every item somewhere.
  if (bestCombo) {
    const used = new Set(Object.values(bestCombo.assignment));
    bestCombo.storeIds = bestCombo.storeIds.filter((id) => used.has(id));
  }

  return { items, perStore, bestSingle, bestCombo };
}
