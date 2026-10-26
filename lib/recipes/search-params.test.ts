import { describe, expect, it } from "vitest";
import { parseRecipeSearchParams, recipeSearchParams } from "./search-params";

describe("parseRecipeSearchParams", () => {
  it("combines all filters with a trimmed query", () => {
    expect(parseRecipeSearchParams({ q: "  arroz  ", style: "healthy", meal: "lunch", max: "20", video: "1" })).toEqual({ q: "arroz", style: "healthy", meal: "lunch", max: 20, video: true });
  });
  it("supports filters without a query", () => {
    expect(parseRecipeSearchParams({ style: "high_protein", video: "1" })).toEqual({ q: "", style: "high_protein", video: true });
  });
  it("ignores unknown values and repeated params", () => {
    expect(parseRecipeSearchParams({ q: ["a", "b"], style: "unknown", meal: "snack", video: "true", max: ["10", "20"] })).toEqual({ q: "" });
  });
  it.each(["0", "-1", "1.5", "2e2", "Infinity", "9007199254740992", "", "20min"])("ignores invalid minutes %s", (max) => {
    expect(parseRecipeSearchParams({ max })).toEqual({ q: "" });
  });
  it("keeps other parameters when removing an active filter", () => {
    const params = recipeSearchParams({ q: "pollo & arroz", style: "one_pot", meal: "dinner", max: 20, video: true });
    params.delete("style");
    expect(parseRecipeSearchParams(Object.fromEntries(params))).toEqual({ q: "pollo & arroz", meal: "dinner", max: 20, video: true });
  });
});
