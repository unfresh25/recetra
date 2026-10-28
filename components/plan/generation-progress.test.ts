import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackGeneration } from "./generation-progress";

const mocks = vi.hoisted(() => ({
  requireReadyMembership: vi.fn(),
  createClient: vi.fn(),
  loadPlanInputs: vi.fn(),
  generatePlan: vi.fn(),
  updateTag: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireReadyMembership: mocks.requireReadyMembership }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/plan/data", () => ({ loadPlanInputs: mocks.loadPlanInputs }));
vi.mock("@/lib/plan/engine", () => ({ generatePlan: mocks.generatePlan, MEAL_ORDER: ["breakfast", "lunch", "dinner"] }));
vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));

import { completeWeek, refreshGeneratedWeek } from "@/lib/plan/actions";
import { DATA_TAG } from "@/lib/cache";

function deferred() {
  let resolve!: (result: { error?: string }) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<{ error?: string }>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function callbacks() {
  return { onStep: vi.fn(), onError: vi.fn(), onComplete: vi.fn() };
}

describe("plan generation pacing", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("gives each step 700ms even for instant generation, then shows success for 600ms", async () => {
    const events = callbacks();
    trackGeneration(Promise.resolve({}), events);

    await vi.advanceTimersByTimeAsync(699);
    expect(events.onStep).not.toHaveBeenCalled();
    for (let step = 1; step <= 3; step++) {
      await vi.advanceTimersByTimeAsync(1);
      expect(events.onStep).toHaveBeenLastCalledWith(step);
      await vi.advanceTimersByTimeAsync(699);
      expect(events.onStep).toHaveBeenCalledTimes(step);
    }
    await vi.advanceTimersByTimeAsync(1);
    expect(events.onStep).toHaveBeenLastCalledWith(4);
    await vi.advanceTimersByTimeAsync(599);
    expect(events.onComplete).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(events.onComplete).toHaveBeenCalledOnce();
  });

  it("holds on the fourth step until a slow request finishes", async () => {
    const request = deferred();
    const events = callbacks();
    trackGeneration(request.promise, events);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(events.onStep.mock.calls.map(([step]) => step)).toEqual([1, 2, 3]);
    expect(events.onComplete).not.toHaveBeenCalled();

    request.resolve({});
    await vi.advanceTimersByTimeAsync(0);
    expect(events.onStep).toHaveBeenLastCalledWith(4);
    await vi.advanceTimersByTimeAsync(600);
    expect(events.onComplete).toHaveBeenCalledOnce();
  });

  it.each(["result", "rejection"])("stops immediately on a %s error", async (kind) => {
    const request = deferred();
    const events = callbacks();
    trackGeneration(request.promise, events);
    await vi.advanceTimersByTimeAsync(800);
    if (kind === "result") request.resolve({ error: "No hay conexión" });
    else request.reject(new Error("offline"));
    await vi.advanceTimersByTimeAsync(10_000);

    expect(events.onError).toHaveBeenCalledWith(kind === "result" ? "No hay conexión" : "No pudimos armar el plan. Intenta de nuevo.");
    expect(events.onStep.mock.calls).toEqual([[1]]);
    expect(events.onComplete).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["pending", "success"])("cleans up when unmounted during %s", async (phase) => {
    const request = deferred();
    const events = callbacks();
    const dispose = trackGeneration(request.promise, events);
    if (phase === "success") {
      request.resolve({});
      await vi.advanceTimersByTimeAsync(2800);
    }
    dispose();
    vi.clearAllMocks();
    request.resolve({});
    await vi.advanceTimersByTimeAsync(10_000);
    expect(events.onStep).not.toHaveBeenCalled();
    expect(events.onError).not.toHaveBeenCalled();
    expect(events.onComplete).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("allows an effect replay to subscribe to the same request without stale callbacks", async () => {
    const request = deferred();
    const stale = callbacks();
    trackGeneration(request.promise, stale)();
    const current = callbacks();
    trackGeneration(request.promise, current);
    request.resolve({});
    await vi.advanceTimersByTimeAsync(3400);
    expect(stale.onStep).not.toHaveBeenCalled();
    expect(stale.onComplete).not.toHaveBeenCalled();
    expect(current.onComplete).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports a failed async completion without an unhandled rejection", async () => {
    const events = callbacks();
    events.onComplete.mockRejectedValue(new Error("refresh failed"));
    trackGeneration(Promise.resolve({}), events);

    await vi.advanceTimersByTimeAsync(3400);

    expect(events.onError).toHaveBeenCalledWith("No pudimos actualizar el plan. Intenta de nuevo.");
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("generation refresh boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    mocks.requireReadyMembership.mockResolvedValue({ household: { id: "household" } });
    vi.setSystemTime(new Date("2026-10-21T12:00:00Z"));
    mocks.loadPlanInputs.mockResolvedValue({ candidates: [], ctx: {}, servings: 2 });
    mocks.generatePlan.mockReturnValue([]);
    mocks.rpc.mockResolvedValue({ error: null });
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc, from: vi.fn(() => query) });
  });
  afterEach(() => vi.useRealTimers());

  it("saves the generated week without invalidating the route that owns the progress view", async () => {
    await expect(completeWeek("2026-10-19")).resolves.toEqual({});
    expect(mocks.rpc).toHaveBeenCalledWith("fill_empty_plan_meals", expect.objectContaining({ p_week_start: "2026-10-19" }));
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it.each(["2026-10-12", "2026-11-02", "2026-10-20", "bad-date"])("refuses an unavailable week before reading or writing: %s", async (week) => {
    expect((await completeWeek(week)).error).toBeTruthy();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("pins placed and cooked slots, and submits only the remaining spaces", async () => {
    const client = await mocks.createClient();
    client.from().maybeSingle.mockResolvedValue({ data: { plan_meals: [
      { day: "2026-10-19", meal_type: "lunch", recipe_id: "chosen", status: "planned" },
      { day: "2026-10-20", meal_type: "lunch", recipe_id: "cooked", status: "cooked" },
      { day: "2026-10-21", meal_type: "lunch", recipe_id: null, status: "cooked" },
    ] }, error: null });
    mocks.generatePlan.mockReturnValue([
      { day: "2026-10-19", mealType: "breakfast", recipeId: "not-for-the-past", adjustments: [] },
      { day: "2026-10-19", mealType: "lunch", recipeId: "chosen", adjustments: [] },
      { day: "2026-10-20", mealType: "lunch", recipeId: "cooked", adjustments: [] },
      { day: "2026-10-21", mealType: "lunch", recipeId: null, adjustments: [] },
      { day: "2026-10-22", mealType: "lunch", recipeId: "suggested", adjustments: [] },
      { day: "2026-10-23", mealType: "lunch", recipeId: null, adjustments: [], emptyReason: "Sin opciones" },
    ]);
    await expect(completeWeek("2026-10-19")).resolves.toEqual({});
    const pinned = mocks.generatePlan.mock.calls[0]![1].pinned;
    expect(pinned).toEqual(expect.arrayContaining([
      { day: "2026-10-19", mealType: "lunch", recipeId: "chosen" },
      { day: "2026-10-20", mealType: "lunch", recipeId: "cooked" },
      { day: "2026-10-21", mealType: "lunch", recipeId: null },
    ]));
    expect(pinned.filter((meal: { day: string }) => meal.day < "2026-10-21")).toHaveLength(6);
    expect(mocks.rpc).toHaveBeenCalledWith("fill_empty_plan_meals", { p_week_start: "2026-10-19", p_meals: [
      { day: "2026-10-22", meal_type: "lunch", recipe_id: "suggested", servings: 2, adjustments: { removed: [] } },
      { day: "2026-10-23", meal_type: "lunch", recipe_id: "", servings: 2, adjustments: { empty_reason: "Sin opciones" } },
    ] });
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("leaves empty past days untouched while completing today's meals", async () => {
    mocks.generatePlan.mockReturnValue([
      { day: "2026-10-19", mealType: "breakfast", recipeId: "past-choice", adjustments: [] },
      { day: "2026-10-21", mealType: "breakfast", recipeId: "today-choice", adjustments: [] },
    ]);
    await completeWeek("2026-10-19");
    expect(mocks.generatePlan.mock.calls[0]![1].pinned).toContainEqual({ day: "2026-10-19", mealType: "breakfast", recipeId: null });
    expect(mocks.rpc).toHaveBeenCalledWith("fill_empty_plan_meals", {
      p_week_start: "2026-10-19",
      p_meals: [{ day: "2026-10-21", meal_type: "breakfast", recipe_id: "today-choice", servings: 2, adjustments: { removed: [] } }],
    });
  });

  it("does not complete a week when its existing choices cannot be read", async () => {
    const client = await mocks.createClient();
    client.from().maybeSingle.mockResolvedValue({ data: null, error: new Error("read failed") });
    expect((await completeWeek("2026-10-19")).error).toBeTruthy();
    expect(mocks.generatePlan).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("invalidates and refreshes only after every step and the success message have been shown", async () => {
    const events = callbacks();
    trackGeneration(completeWeek("2026-10-19"), { ...events, onComplete: refreshGeneratedWeek });

    await vi.advanceTimersByTimeAsync(500);
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.updateTag).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2300);
    expect(events.onStep).toHaveBeenLastCalledWith(4);
    expect(mocks.updateTag).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(599);
    expect(mocks.updateTag).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.updateTag).toHaveBeenCalledExactlyOnceWith(DATA_TAG);
  });

  it("does not refresh when saving the plan fails", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "save failed" } });
    const events = callbacks();
    trackGeneration(completeWeek("2026-10-19"), { ...events, onComplete: refreshGeneratedWeek });

    await vi.advanceTimersByTimeAsync(10_000);

    expect(events.onError).toHaveBeenCalledWith("No pudimos armar el plan. Intenta de nuevo.");
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("requires membership before invalidating data", async () => {
    mocks.requireReadyMembership.mockRejectedValue(new Error("unauthorized"));

    await expect(refreshGeneratedWeek()).rejects.toThrow("unauthorized");

    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("reports a refresh failure after pacing finishes", async () => {
    mocks.updateTag.mockImplementation(() => { throw new Error("refresh failed"); });
    const events = callbacks();
    trackGeneration(completeWeek("2026-10-19"), { ...events, onComplete: refreshGeneratedWeek });

    await vi.advanceTimersByTimeAsync(3400);

    expect(events.onError).toHaveBeenCalledWith("No pudimos actualizar el plan. Intenta de nuevo.");
    expect(vi.getTimerCount()).toBe(0);
  });
});
