import { describe, expect, it } from "vitest";
import { recipeOfTheDay } from "./selection";

const recipes = Array.from({ length: 31 }, (_, id) => ({ id: String(id).padStart(2, "0") }));

describe("recipeOfTheDay", () => {
  it("handles an empty catalog and a single recipe", () => {
    expect(recipeOfTheDay([])).toBeNull();
    expect(recipeOfTheDay([recipes[0]!])).toBe(recipes[0]);
  });
  it("is independent of input ordering and stable throughout a Bogotá day", () => {
    const morning = recipeOfTheDay(recipes, new Date("2026-10-26T05:00:00Z"));
    expect(recipeOfTheDay([...recipes].reverse(), new Date("2026-10-27T04:59:59Z"))).toBe(morning);
  });
  it("changes its seed at midnight in Bogotá rather than UTC", () => {
    expect(recipeOfTheDay(recipes, new Date("2026-10-27T04:59:59Z"))).not.toBe(recipeOfTheDay(recipes, new Date("2026-10-27T05:00:00Z")));
  });
  it("never selects a recipe outside the eligible catalog or mutates the list", () => {
    const eligible = [recipes[10]!, recipes[3]!, recipes[20]!];
    const before = [...eligible];
    expect(eligible).toContain(recipeOfTheDay(eligible));
    expect(eligible).toEqual(before);
  });
});
