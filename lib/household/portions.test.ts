import { describe, expect, it } from "vitest";
import { householdPortions } from "./portions";

describe("householdPortions", () => {
  it.each([
    [2, 0, 2],
    [2, 1, 3],
    [2, 2, 3],
    [2, 3, 4],
    [1, 0, 1],
  ])("counts %i adults and %i kids as %i portions", (adults, kids, portions) => {
    expect(householdPortions({ adults, kids })).toBe(portions);
  });
});
