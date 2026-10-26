import type {
  Adjustment,
  Candidate,
  CandidateIngredient,
  Diet,
  Eligibility,
  IngredientCategory,
  MealType,
  MemberProfile,
  PlanContext,
  PlannedMeal,
  ReplaceReason,
} from "./types";

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner"];
const DAYS = 7;
const EXPLORATION_SHARE = 0.15;

/** Ingredients a diet forbids. Core violations exclude the recipe; accessory ones are removed. */
type DietRule = { categories?: IngredientCategory[]; allergens?: string[]; slugs?: string[]; allowSlugs?: string[] };

const LOW_CARB_RULE = {
  categories: ["grains", "bakery", "sweeteners"],
  slugs: ["papa-pastusa", "papa-sabanera", "papa-criolla", "yuca", "platano-maduro", "platano-verde", "arepa"],
} satisfies DietRule;

const DIET_RULES: Record<Diet, DietRule> = {
  vegetarian: { categories: ["meat", "poultry", "fish", "seafood"] },
  vegan: { categories: ["meat", "poultry", "fish", "seafood", "dairy", "eggs"], slugs: ["miel"] },
  pescatarian: { categories: ["meat", "poultry"] },
  gluten_free: { allergens: ["gluten"] },
  dairy_free: { allergens: ["dairy"] },
  paleo: { categories: ["grains", "legumes", "dairy", "bakery", "sweeteners"], allowSlugs: ["miel"] },
  low_carb: LOW_CARB_RULE,
  keto: {
    categories: [...LOW_CARB_RULE.categories, "legumes"],
    slugs: [...LOW_CARB_RULE.slugs, "banano", "mango", "pina", "uvas", "papaya", "guayaba"],
  },
};

/** Garnish swaps we can suggest when an accessory ingredient is removed. */
const SUBSTITUTES: Record<string, string> = {
  cilantro: "Perejil",
  perejil: "Cebolla larga",
  "cebolla-cabezona": "Cebolla larga",
  "aji-picante": "Pimentón",
  aguacate: "Tomate en rodajas",
};

const PROTEIN_CATEGORIES: IngredientCategory[] = ["meat", "poultry", "fish", "seafood", "eggs", "legumes"];

function violatesDiet(ingredient: CandidateIngredient, diet: Diet) {
  const rule = DIET_RULES[diet];
  if (rule.allowSlugs?.includes(ingredient.slug)) return false;
  return (
    rule.categories?.includes(ingredient.category) ||
    rule.allergens?.some((a) => ingredient.allergens.includes(a as never)) ||
    rule.slugs?.includes(ingredient.slug) ||
    false
  );
}

function dislikes(member: MemberProfile, ingredient: CandidateIngredient) {
  return member.dislikeIngredientIds.includes(ingredient.ingredientId) || member.dislikeCategories.includes(ingredient.category);
}

/**
 * Hard filters for one recipe and the whole household. Allergies are absolute: any ingredient
 * carrying the allergen excludes the recipe, garnish or not.
 */
export function checkEligibility(recipe: Candidate, ctx: Pick<PlanContext, "members" | "equipment" | "reactions">): Eligibility {
  const reactions = ctx.reactions[recipe.id] ?? {};
  if (ctx.members.some((m) => reactions[m.id]?.veto)) return { ok: false, reason: "veto" };

  for (const member of ctx.members) {
    if (recipe.ingredients.some((i) => i.allergens.some((a) => member.allergies.includes(a)))) {
      return { ok: false, reason: "allergy" };
    }
  }

  if (recipe.equipment.some((e) => !ctx.equipment.includes(e))) return { ok: false, reason: "equipment" };

  const removals = new Map<string, { ingredient: CandidateIngredient; members: Set<string> }>();
  for (const ingredient of recipe.ingredients) {
    for (const member of ctx.members) {
      const dietHit = member.diets.some((d) => violatesDiet(ingredient, d));
      const dislikeHit = dislikes(member, ingredient);
      if (!dietHit && !dislikeHit) continue;
      if (ingredient.role === "core") return { ok: false, reason: dietHit ? "diet" : "dislike" };
      const entry = removals.get(ingredient.ingredientId) ?? { ingredient, members: new Set<string>() };
      entry.members.add(member.name);
      removals.set(ingredient.ingredientId, entry);
    }
  }

  const adjustments: Adjustment[] = [...removals.values()].map(({ ingredient, members }) => ({
    ingredientId: ingredient.ingredientId,
    ingredientName: ingredient.name,
    memberNames: [...members],
    substituteName: SUBSTITUTES[ingredient.slug] ?? null,
  }));
  return { ok: true, adjustments };
}

/** Deterministic PRNG so a plan can be reproduced from its seed. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isWeekend(iso: string) {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

function defaultMaxMinutes(meal: MealType, weekend: boolean) {
  if (meal === "breakfast") return weekend ? 45 : 20;
  if (meal === "lunch") return weekend ? 90 : 60;
  return weekend ? 60 : 40;
}

/** Combined preference of the household: one strong "no" sinks the recipe, otherwise the average. */
export function householdPreference(recipeId: string, ctx: Pick<PlanContext, "members" | "reactions">) {
  const reactions = ctx.reactions[recipeId] ?? {};
  const scores = ctx.members.map((m) => reactions[m.id]?.score ?? 0);
  const rated = ctx.members.some((m) => reactions[m.id]);
  if (scores.some((s) => s <= -3)) return { value: -6, rated };
  return { value: scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1), rated };
}

function coreIngredientIds(recipe: Candidate) {
  return recipe.ingredients.filter((i) => i.role === "core").map((i) => i.ingredientId);
}

export function mainProtein(recipe: Candidate): IngredientCategory | null {
  return recipe.ingredients.find((i) => i.role === "core" && PROTEIN_CATEGORIES.includes(i.category))?.category ?? null;
}

type ScoreInput = {
  recipe: Candidate;
  meal: MealType;
  day: string;
  ctx: PlanContext;
  usedCounts: Map<string, number>;
  usedCore: Set<string>;
  explore: boolean;
  jitter: number;
};

export function scoreRecipe({ recipe, meal, day, ctx, usedCounts, usedCore, explore, jitter }: ScoreInput) {
  const pref = householdPreference(recipe.id, ctx);
  let score = 3 * pref.value;

  score += Math.min(recipe.styles.filter((s) => ctx.styles.includes(s)).length * 0.8, 2);

  const maxMinutes = ctx.maxMinutesByMeal[meal] ?? defaultMaxMinutes(meal, isWeekend(day));
  if (recipe.minutes && recipe.minutes > maxMinutes) score -= Math.min((recipe.minutes - maxMinutes) / 15, 3);

  const cooked = ctx.daysSinceCooked[recipe.id];
  if (cooked !== undefined && cooked < 14) score -= 2 * (1 - cooked / 14);
  score -= 4 * (usedCounts.get(recipe.id) ?? 0);

  const shared = coreIngredientIds(recipe).filter((id) => usedCore.has(id)).length;
  score += Math.min(shared * 0.25, 1);

  if (recipe.estimatedCost && ctx.weeklyBudget) {
    const over = recipe.estimatedCost / (ctx.weeklyBudget / 21) - 1;
    if (over > 0) score -= over * 4 * ctx.priceSensitivity;
  }

  if (explore && !pref.rated) score += 2.5;
  return score + jitter;
}

export function emptyReasonCopy(reasons: Map<string, number>, meal: MealType) {
  const top = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const label = { breakfast: "desayuno", lunch: "almuerzo", dinner: "cena" }[meal];
  switch (top) {
    case "allergy":
      return `Las recetas de ${label} que tenemos chocan con alergias del hogar. Importa más recetas.`;
    case "dislike":
    case "diet":
      return `Las recetas de ${label} que tenemos llevan algo que no comen. Importa más recetas o ajusta tus preferencias.`;
    case "equipment":
      return `Las recetas de ${label} necesitan equipos que no marcaste en tu cocina.`;
    case "veto":
      return `Vetaron todas las recetas de ${label} que tenemos.`;
    default:
      return `Aún no hay recetas de ${label}. Importa algunas para completar el plan.`;
  }
}

/** Builds the week greedily: day by day, breakfast → lunch → dinner. Never violates an allergy. */
export function generatePlan(candidates: Candidate[], ctx: PlanContext): PlannedMeal[] {
  const random = mulberry32(ctx.seed);
  const eligibility = new Map(candidates.map((r) => [r.id, checkEligibility(r, ctx)]));
  const usedCounts = new Map<string, number>();
  const usedCore = new Set<string>();
  const plan: PlannedMeal[] = [];
  const totalSlots = DAYS * MEAL_ORDER.length;
  const exploreEvery = Math.max(1, Math.round(1 / EXPLORATION_SHARE));

  for (let d = 0; d < DAYS; d++) {
    const day = addDays(ctx.weekStart, d);
    for (const meal of MEAL_ORDER) {
      const slotIndex = plan.length;
      const explore = slotIndex % exploreEvery === exploreEvery - 1 && slotIndex < totalSlots;
      const reasons = new Map<string, number>();
      let best: { recipe: Candidate; score: number; adjustments: PlannedMeal["adjustments"] } | null = null;

      for (const recipe of candidates) {
        if (!recipe.mealTypes.includes(meal)) continue;
        const check = eligibility.get(recipe.id)!;
        if (!check.ok) {
          reasons.set(check.reason, (reasons.get(check.reason) ?? 0) + 1);
          continue;
        }
        const score = scoreRecipe({ recipe, meal, day, ctx, usedCounts, usedCore, explore, jitter: random() * 0.6 });
        if (!best || score > best.score) best = { recipe, score, adjustments: check.adjustments };
      }

      if (!best) {
        plan.push({ day, mealType: meal, recipeId: null, adjustments: [], emptyReason: emptyReasonCopy(reasons, meal) });
        continue;
      }
      usedCounts.set(best.recipe.id, (usedCounts.get(best.recipe.id) ?? 0) + 1);
      for (const id of coreIngredientIds(best.recipe)) usedCore.add(id);
      plan.push({ day, mealType: meal, recipeId: best.recipe.id, adjustments: best.adjustments, emptyReason: null });
    }
  }
  return plan;
}

/** Top alternatives for one slot, honoring the reason the household gave for replacing it. */
export function alternativesFor(
  candidates: Candidate[],
  ctx: PlanContext,
  plan: PlannedMeal[],
  slot: { day: string; mealType: MealType; recipeId: string | null },
  reason: ReplaceReason | null,
  limit = 5,
) {
  const current = candidates.find((c) => c.id === slot.recipeId) ?? null;
  const usedCounts = new Map<string, number>();
  const usedCore = new Set<string>();
  for (const meal of plan) {
    if (!meal.recipeId || (meal.day === slot.day && meal.mealType === slot.mealType)) continue;
    usedCounts.set(meal.recipeId, (usedCounts.get(meal.recipeId) ?? 0) + 1);
    const recipe = candidates.find((c) => c.id === meal.recipeId);
    if (recipe) for (const id of coreIngredientIds(recipe)) usedCore.add(id);
  }
  const random = mulberry32(ctx.seed ^ slot.day.length ^ slot.mealType.length);
  const currentProtein = current ? mainProtein(current) : null;

  return candidates
    .filter((r) => r.id !== slot.recipeId && r.mealTypes.includes(slot.mealType))
    .filter((r) => {
      if (reason === "too_slow" && current?.minutes && r.minutes) return r.minutes < current.minutes;
      if (reason === "repeated" && currentProtein) return mainProtein(r) !== currentProtein;
      if (reason === "too_expensive" && current?.estimatedCost && r.estimatedCost) return r.estimatedCost < current.estimatedCost;
      return true;
    })
    .flatMap((recipe) => {
      const check = checkEligibility(recipe, ctx);
      if (!check.ok) return [];
      const score = scoreRecipe({
        recipe,
        meal: slot.mealType,
        day: slot.day,
        ctx,
        usedCounts,
        usedCore,
        explore: false,
        jitter: random() * 0.3,
      });
      return [{ recipe, score, adjustments: check.adjustments }];
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
