import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { alternativesFor, checkEligibility, generatePlan } from "./engine";
import { summarizeReactions } from "./reactions";
import type { Allergen, Candidate, CandidateIngredient, Diet, IngredientCategory, MealType, MemberProfile, PlanContext } from "./types";

const ing = (slug: string, category: IngredientCategory, opts: Partial<CandidateIngredient> = {}): CandidateIngredient => ({
  ingredientId: `id-${slug}`,
  name: slug,
  slug,
  category,
  allergens: [],
  role: "core",
  substituteIds: [],
  ...opts,
});

const recipe = (id: string, mealTypes: MealType[], ingredients: CandidateIngredient[], extra: Partial<Candidate> = {}): Candidate => ({
  id,
  title: id,
  mealTypes,
  minutes: 20,
  styles: [],
  equipment: [],
  ingredients,
  estimatedCost: null,
  ...extra,
});

const jorge: MemberProfile = { id: "m1", name: "Jorge", allergies: [], dislikeIngredientIds: ["id-cilantro"], dislikeCategories: [], diets: [] };
const ana: MemberProfile = { id: "m2", name: "Ana", allergies: ["shellfish"], dislikeIngredientIds: [], dislikeCategories: [], diets: [] };

const ctx = (overrides: Partial<PlanContext> = {}): PlanContext => ({
  weekStart: "2026-10-19",
  members: [jorge, ana],
  equipment: ["stovetop", "oven"],
  styles: [],
  weeklyBudget: null,
  priceSensitivity: 0.5,
  maxMinutesByMeal: {},
  reactions: {},
  daysSinceCooked: {},
  seed: 1,
  ...overrides,
});

const pericos = recipe("pericos", ["breakfast", "dinner"], [ing("huevo", "eggs", { allergens: ["egg"] }), ing("tomate", "produce"), ing("cebolla-larga", "produce")]);
const sancocho = recipe("sancocho", ["lunch"], [ing("pollo", "poultry"), ing("yuca", "produce"), ing("cilantro", "herbs", { role: "accessory" })]);
const arrozCamarones = recipe("arroz-camarones", ["lunch"], [ing("camaron", "seafood", { allergens: ["shellfish"] }), ing("arroz", "grains")]);
const ajiaco = recipe("ajiaco", ["lunch"], [ing("pollo", "poultry"), ing("papa", "produce"), ing("guascas", "herbs")]);
const cilantroSalsa = recipe("salsa-cilantro", ["dinner"], [ing("cilantro", "herbs"), ing("limon", "produce")]);
const wrap = recipe("wrap", ["dinner"], [ing("pollo", "poultry"), ing("tortilla", "bakery", { allergens: ["gluten"] })]);
const lasagna = recipe("lasagna", ["dinner"], [ing("pasta", "grains", { allergens: ["gluten"] })], { equipment: ["oven", "blender"] });

describe("checkEligibility", () => {
  it("excludes a recipe with an allergen for any member, even as garnish", () => {
    expect(checkEligibility(arrozCamarones, ctx())).toEqual({ ok: false, reason: "allergy" });
    const garnish = recipe("x", ["lunch"], [ing("arroz", "grains"), ing("camaron", "seafood", { allergens: ["shellfish"], role: "accessory" })]);
    expect(checkEligibility(garnish, ctx())).toEqual({ ok: false, reason: "allergy" });
  });

  it("removes a disliked garnish and suggests a swap", () => {
    const result = checkEligibility(sancocho, ctx());
    expect(result).toEqual({
      ok: true,
      adjustments: [{ ingredientId: "id-cilantro", ingredientName: "cilantro", memberNames: ["Jorge"], substituteName: "Perejil" }],
    });
  });

  it("excludes a recipe where the disliked ingredient is the protagonist", () => {
    expect(checkEligibility(cilantroSalsa, ctx())).toEqual({ ok: false, reason: "dislike" });
  });

  it("applies diets and kitchen equipment", () => {
    const veggie = ctx({ members: [{ ...jorge, diets: ["vegetarian"] }] });
    expect(checkEligibility(sancocho, veggie)).toEqual({ ok: false, reason: "diet" });
    expect(checkEligibility(lasagna, ctx())).toEqual({ ok: false, reason: "equipment" });
  });

  const dietCases: [Diet, string, IngredientCategory][] = [
    ["paleo", "arroz-blanco", "grains"],
    ["paleo", "lenteja", "legumes"],
    ["paleo", "leche", "dairy"],
    ["paleo", "arepa", "bakery"],
    ["paleo", "panela", "sweeteners"],
    ...(["low_carb", "keto"] as const).flatMap((diet): [Diet, string, IngredientCategory][] => [
      [diet, "arroz-blanco", "grains"],
      [diet, "arepa", "bakery"],
      [diet, "miel", "sweeteners"],
      ...["papa-pastusa", "papa-sabanera", "papa-criolla", "yuca", "platano-maduro", "platano-verde"].map(
        (slug): [Diet, string, IngredientCategory] => [diet, slug, "produce"],
      ),
    ]),
    ["keto", "lenteja", "legumes"],
    ...["banano", "mango", "pina", "uvas", "papaya", "guayaba"].map(
      (slug): [Diet, string, IngredientCategory] => ["keto", slug, "produce"],
    ),
  ];

  it.each(dietCases)("%s excludes a core %s (%s)", (diet, slug, category) => {
    const dish = recipe("diet-test", ["lunch"], [ing(slug, category)]);
    expect(checkEligibility(dish, ctx({ members: [{ ...jorge, diets: [diet] }] }))).toEqual({ ok: false, reason: "diet" });
  });

  it.each(dietCases)("%s removes an accessory %s (%s)", (diet, slug, category) => {
    const dish = recipe("diet-test", ["lunch"], [ing("tomate", "produce"), ing(slug, category, { role: "accessory" })]);
    expect(checkEligibility(dish, ctx({ members: [{ ...jorge, diets: [diet] }] }))).toEqual({
      ok: true,
      adjustments: [{ ingredientId: `id-${slug}`, ingredientName: slug, memberNames: ["Jorge"], substituteName: null }],
    });
  });

  it("paleo keeps honey without overriding another diet or an allergy", () => {
    const dish = recipe("honey", ["breakfast"], [ing("miel", "sweeteners")]);
    const paleo = { ...jorge, diets: ["paleo"] as Diet[] };
    expect(checkEligibility(dish, ctx({ members: [paleo] }))).toEqual({ ok: true, adjustments: [] });
    expect(checkEligibility(dish, ctx({ members: [{ ...paleo, diets: ["paleo", "vegan"] }] }))).toEqual({ ok: false, reason: "diet" });
    const withAllergen = recipe("honey-allergen", ["breakfast"], [ing("miel", "sweeteners", { allergens: ["peanut"] })]);
    expect(checkEligibility(withAllergen, ctx({ members: [{ ...paleo, allergies: ["peanut"] }] }))).toEqual({ ok: false, reason: "allergy" });
  });

  it("low carb keeps legumes and fruit that keto excludes", () => {
    const dish = recipe("lentils-mango", ["lunch"], [ing("lenteja", "legumes"), ing("mango", "produce")]);
    expect(checkEligibility(dish, ctx({ members: [{ ...jorge, diets: ["low_carb"] }] }))).toEqual({ ok: true, adjustments: [] });
  });

  it("respects vetoes from either member", () => {
    const reactions = summarizeReactions([{ member_id: "m2", recipe_id: "ajiaco", kind: "veto", reason: null, created_at: "2026-10-01" }]);
    expect(checkEligibility(ajiaco, ctx({ reactions }))).toEqual({ ok: false, reason: "veto" });
  });
});

describe("generatePlan", () => {
  const catalog = [pericos, sancocho, arrozCamarones, ajiaco, cilantroSalsa, wrap, lasagna];

  it("keeps the seeded result for a week without pinned slots", () => {
    expect(generatePlan(catalog, ctx()).map((meal) => meal.recipeId)).toMatchInlineSnapshot(`
      [
        "pericos",
        "ajiaco",
        "wrap",
        "pericos",
        "sancocho",
        "wrap",
        "pericos",
        "ajiaco",
        "wrap",
        "pericos",
        "sancocho",
        "wrap",
        "pericos",
        "ajiaco",
        "wrap",
        "pericos",
        "sancocho",
        "wrap",
        "pericos",
        "ajiaco",
        "wrap",
      ]
    `);
    expect(generatePlan(catalog, { ...ctx(), pinned: [] })).toEqual(generatePlan(catalog, ctx()));
  });

  it("keeps all pinned choices, including recipes no longer in the eligible catalog", () => {
    const pinned = [
      { day: "2026-10-19", mealType: "lunch" as const, recipeId: "retired-recipe" },
      { day: "2026-10-25", mealType: "dinner" as const, recipeId: sancocho.id },
      { day: "2026-10-20", mealType: "breakfast" as const, recipeId: null },
    ];
    const plan = generatePlan(catalog, ctx({ pinned }));
    expect(plan).toHaveLength(21);
    for (const meal of pinned) expect(plan.find((slot) => slot.day === meal.day && slot.mealType === meal.mealType)).toMatchObject(meal);
  });

  it("counts a choice at the end of the week toward repetition before filling Monday", () => {
    const a = recipe("a", ["breakfast"], []);
    const b = recipe("b", ["breakfast"], []);
    const plan = generatePlan([a, b], ctx({ pinned: [{ day: "2026-10-25", mealType: "breakfast", recipeId: a.id }] }));
    expect(plan[0]!.recipeId).toBe(b.id);
    expect(plan[18]!.recipeId).toBe(a.id);
  });

  it("reuses core ingredients from future pinned recipes when scoring empty slots", () => {
    const core = ["tomate", "papa", "cebolla", "zanahoria"].map((name) => ing(name, "produce"));
    const unrelated = recipe("unrelated", ["breakfast"], []);
    const shared = recipe("shared", ["breakfast"], core);
    const chosen = recipe("chosen", ["dinner"], core);
    const candidates = [unrelated, shared, chosen];
    expect(generatePlan(candidates, ctx())[0]!.recipeId).toBe(unrelated.id);
    expect(generatePlan(candidates, ctx({ pinned: [{ day: "2026-10-25", mealType: "dinner", recipeId: chosen.id }] }))[0]!.recipeId).toBe(shared.id);
  });


  it("fills 21 slots, each with a recipe of the right meal type", () => {
    const plan = generatePlan(catalog, ctx());
    expect(plan).toHaveLength(21);
    for (const slot of plan) {
      const r = catalog.find((c) => c.id === slot.recipeId);
      expect(r?.mealTypes).toContain(slot.mealType);
    }
    expect(plan.map((p) => p.day).filter((d, i, a) => a.indexOf(d) === i)).toHaveLength(7);
  });

  it("explains empty slots instead of breaking a rule", () => {
    const plan = generatePlan([arrozCamarones], ctx());
    const lunch = plan.find((p) => p.mealType === "lunch")!;
    expect(lunch.recipeId).toBeNull();
    expect(lunch.emptyReason).toMatch(/alergias/);
    expect(plan.find((p) => p.mealType === "breakfast")!.emptyReason).toMatch(/Aún no hay recetas de desayuno/);
  });

  it("prefers favorites of both and avoids strong dislikes", () => {
    const reactions = summarizeReactions([
      { member_id: "m1", recipe_id: "ajiaco", kind: "favorite", reason: null, created_at: "2026-10-10" },
      { member_id: "m2", recipe_id: "ajiaco", kind: "favorite", reason: null, created_at: "2026-10-10" },
      { member_id: "m2", recipe_id: "sancocho", kind: "dislike", reason: null, created_at: "2026-10-10" },
    ]);
    const plan = generatePlan([sancocho, ajiaco], ctx({ reactions }));
    expect(plan.find((p) => p.mealType === "lunch")!.recipeId).toBe("ajiaco");
  });

  it("varies the week instead of repeating the same dish", () => {
    const lunches = Array.from({ length: 7 }, (_, i) => recipe(`l${i}`, ["lunch"], [ing(`p${i}`, "poultry")]));
    const plan = generatePlan(lunches, ctx());
    const used = plan.filter((p) => p.mealType === "lunch").map((p) => p.recipeId);
    expect(new Set(used).size).toBe(7);
  });
});

describe("alternativesFor", () => {
  it("offers faster recipes when the reason is too_slow", () => {
    const slow = recipe("slow", ["lunch"], [ing("res", "meat")], { minutes: 120 });
    const quick = recipe("quick", ["lunch"], [ing("pollo", "poultry")], { minutes: 25 });
    const slower = recipe("slower", ["lunch"], [ing("cerdo", "meat")], { minutes: 150 });
    const plan = generatePlan([slow], ctx());
    const slot = plan.find((p) => p.mealType === "lunch")!;
    const alts = alternativesFor([slow, quick, slower], ctx(), plan, slot, "too_slow");
    expect(alts.map((a) => a.recipe.id)).toEqual(["quick"]);
  });

  it("offers a different protein when the reason is repeated", () => {
    const pollo1 = recipe("pollo1", ["lunch"], [ing("pollo", "poultry")]);
    const pollo2 = recipe("pollo2", ["lunch"], [ing("pollo", "poultry")]);
    const res = recipe("res", ["lunch"], [ing("res", "meat")]);
    const plan = generatePlan([pollo1], ctx());
    const slot = plan.find((p) => p.mealType === "lunch")!;
    expect(alternativesFor([pollo1, pollo2, res], ctx(), plan, slot, "repeated").map((a) => a.recipe.id)).toEqual(["res"]);
  });
});

// Property: whatever the catalog and the household, no planned meal carries an allergen of any member.
const allergens: Allergen[] = ["peanut", "tree_nut", "dairy", "egg", "gluten", "soy", "fish", "shellfish", "sesame"];
const categories: IngredientCategory[] = ["produce", "meat", "poultry", "fish", "seafood", "dairy", "eggs", "grains", "herbs"];

const ingredientArb = fc.record({
  ingredientId: fc.constantFrom(...Array.from({ length: 20 }, (_, i) => `i${i}`)),
  name: fc.constant("x") as fc.Arbitrary<string>,
  slug: fc.constant("x") as fc.Arbitrary<string>,
  category: fc.constantFrom(...categories),
  allergens: fc.subarray(allergens, { maxLength: 2 }),
  role: fc.constantFrom("core" as const, "accessory" as const),
  substituteIds: fc.constant([] as string[]),
});
const recipeArb = fc.record({
  id: fc.uuid(),
  title: fc.constant("r") as fc.Arbitrary<string>,
  mealTypes: fc.subarray(["breakfast", "lunch", "dinner"] as MealType[], { minLength: 1 }),
  minutes: fc.option(fc.integer({ min: 5, max: 180 }), { nil: null }),
  styles: fc.constant([] as Candidate["styles"]),
  equipment: fc.constant([] as Candidate["equipment"]),
  ingredients: fc.array(ingredientArb, { minLength: 1, maxLength: 8 }),
  estimatedCost: fc.constant(null),
}) as fc.Arbitrary<Candidate>;
const memberArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 5 }),
  allergies: fc.subarray(allergens, { maxLength: 3 }),
  dislikeIngredientIds: fc.subarray(Array.from({ length: 20 }, (_, i) => `i${i}`), { maxLength: 4 }),
  dislikeCategories: fc.subarray(categories, { maxLength: 2 }),
  diets: fc.subarray(["vegetarian", "vegan", "pescatarian", "gluten_free", "dairy_free", "paleo", "low_carb", "keto"] as const, { maxLength: 1 }),
});

describe("generatePlan properties", () => {
  it("never plans a recipe containing an allergen of any member", () => {
    fc.assert(
      fc.property(fc.array(recipeArb, { maxLength: 40 }), fc.array(memberArb, { minLength: 1, maxLength: 3 }), fc.integer(), (catalog, members, seed) => {
        const plan = generatePlan(catalog, ctx({ members: members.map((m) => ({ ...m, diets: [...m.diets] })), seed }));
        const forbidden = new Set(members.flatMap((m) => m.allergies));
        for (const slot of plan) {
          if (!slot.recipeId) continue;
          const r = catalog.find((c) => c.id === slot.recipeId)!;
          expect(r.ingredients.some((i) => i.allergens.some((a) => forbidden.has(a)))).toBe(false);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("never plans a disliked protagonist, and lists every disliked garnish as removed", () => {
    fc.assert(
      fc.property(fc.array(recipeArb, { maxLength: 40 }), fc.array(memberArb, { minLength: 1, maxLength: 3 }), (catalog, members) => {
        const ms = members.map((m) => ({ ...m, diets: [] as never[] }));
        const plan = generatePlan(catalog, ctx({ members: ms }));
        for (const slot of plan) {
          if (!slot.recipeId) continue;
          const r = catalog.find((c) => c.id === slot.recipeId)!;
          for (const i of r.ingredients) {
            const disliked = ms.some((m) => m.dislikeIngredientIds.includes(i.ingredientId) || m.dislikeCategories.includes(i.category));
            if (!disliked) continue;
            expect(i.role).toBe("accessory");
            expect(slot.adjustments.map((a) => a.ingredientId)).toContain(i.ingredientId);
          }
        }
      }),
      { numRuns: 300 },
    );
  });
});
