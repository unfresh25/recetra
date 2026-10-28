import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireReadyMembership: vi.fn(),
  createClient: vi.fn(),
  loadPlanInputs: vi.fn(),
  alternativesFor: vi.fn(),
  updateTag: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireReadyMembership: mocks.requireReadyMembership }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("./data", () => ({ loadPlanInputs: mocks.loadPlanInputs }));
vi.mock("./engine", () => ({ alternativesFor: mocks.alternativesFor, generatePlan: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));

import { placeRecipeInPlan, removeFromPlan } from "./actions";

const recipeId = "00000000-0000-4000-8000-000000000001";
const adjustments = [{ ingredientId: "cilantro", ingredientName: "Cilantro", memberNames: ["Ana"], substituteName: null }];

function query(data: unknown, error: unknown = null) {
  const result = { data, error };
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
}

describe("placeRecipeInPlan", () => {
  let slot: ReturnType<typeof query>;
  let from: ReturnType<typeof vi.fn>;
  let rpc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T15:00:00Z"));
    mocks.requireReadyMembership.mockResolvedValue({ household: { id: "household-id", servings_adults: 2, servings_kids: 0 }, member: { id: "member-id" } });
    mocks.loadPlanInputs.mockResolvedValue({ candidates: [], ctx: {}, servings: 2 });
    mocks.alternativesFor.mockReturnValue([{ recipe: { id: recipeId }, adjustments }]);
    slot = query({ id: "slot-id", recipe_id: "old-recipe" });
    const mealQueries = [slot, query({ id: "slot-id", day: "2026-10-29", meal_type: "dinner", recipe_id: "old-recipe", meal_plan_id: "plan-id", meal_plans: { week_start: "2026-10-26" } }), query([])];
    from = vi.fn(() => mealQueries.shift());
    rpc = vi.fn().mockImplementation(async (name: string) => ({ data: name === "ensure_week_plan" ? "plan-id" : null, error: null }));
    mocks.createClient.mockResolvedValue({ from, rpc });
  });
  afterEach(() => vi.useRealTimers());

  it("finds the household's day/meal slot and delegates to the replacement RPC with a neutral reason", async () => {
    await expect(placeRecipeInPlan(recipeId, "2026-10-29", "dinner")).resolves.toEqual({});
    expect(rpc).toHaveBeenCalledWith("ensure_week_plan", { p_week_start: "2026-10-26", p_servings: 2 });
    expect(slot.eq.mock.calls).toEqual([["meal_plan_id", "plan-id"], ["day", "2026-10-29"], ["meal_type", "dinner"]]);
    expect(rpc).toHaveBeenCalledWith("replace_plan_meal", { p_plan_meal_id: "slot-id", p_recipe_id: recipeId, p_reason: "not_today", p_adjustments: { removed: adjustments } });
    expect(mocks.updateTag).toHaveBeenCalledWith("app-data");
  });

  it("looks up the next week's plan when choosing a day in next week", async () => {
    await placeRecipeInPlan(recipeId, "2026-11-02", "dinner");
    expect(rpc).toHaveBeenCalledWith("ensure_week_plan", { p_week_start: "2026-11-02", p_servings: 2 });
  });

  it.each([
    ["bad-id", "2026-10-29", "dinner"],
    [recipeId, "2026-02-30", "dinner"],
    [recipeId, "2026-10-29", "snack"],
    [recipeId, "2026-10-28", "dinner"],
    [recipeId, "2026-11-09", "dinner"],
  ])("rejects invalid or unavailable selections before querying: %s %s %s", async (id, day, meal) => {
    expect((await placeRecipeInPlan(id, day, meal)).error).toBeTruthy();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("ensures a week and its slots before placing its first recipe", async () => {
    await expect(placeRecipeInPlan(recipeId, "2026-10-29", "dinner")).resolves.toEqual({});
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["ensure_week_plan", "replace_plan_meal"]);
  });

  it("does not place a recipe if ensuring the week fails", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error("ensure failed") });
    expect((await placeRecipeInPlan(recipeId, "2026-10-29", "dinner")).error).toBe("No pudimos consultar tu plan. Intenta de nuevo.");
    expect(from).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("handles an absent slot without mutating another meal", async () => {
    slot.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await placeRecipeInPlan(recipeId, "2026-10-29", "dinner")).error).toBe("No encontramos esa comida en tu plan.");
    expect(rpc).not.toHaveBeenCalledWith("replace_plan_meal", expect.anything());
  });

  it("preserves replacement eligibility checks", async () => {
    mocks.alternativesFor.mockReturnValue([]);
    expect((await placeRecipeInPlan(recipeId, "2026-10-29", "dinner")).error).toBe("Esta receta no es apta para su hogar.");
    expect(rpc).not.toHaveBeenCalledWith("replace_plan_meal", expect.anything());
  });

  it("maps an RPC failure to an inline message and does not invalidate saved data", async () => {
    rpc.mockResolvedValueOnce({ data: "plan-id", error: null }).mockResolvedValueOnce({ error: new Error("write failed") });
    expect((await placeRecipeInPlan(recipeId, "2026-10-29", "dinner")).error).toBe("No pudimos agregar la receta al plan. Intenta de nuevo.");
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
  it("removes a meal through the household RPC and refreshes data", async () => {
    await expect(removeFromPlan(recipeId)).resolves.toEqual({});
    expect(rpc).toHaveBeenCalledWith("clear_plan_meal", { p_plan_meal_id: recipeId });
    expect(mocks.updateTag).toHaveBeenCalledWith("app-data");
  });

  it("does not refresh after a refused removal", async () => {
    rpc.mockResolvedValue({ error: new Error("meal_already_cooked") });
    expect((await removeFromPlan(recipeId)).error).toBeTruthy();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});
