import { describe, expect, it } from "vitest";
import { parseServings, scaleQuantity, withServings } from "./servings";

describe("parseServings", () => {
  it.each([1, 2, 7, 20])("accepts %i servings", (value) => {
    expect(parseServings(String(value), 4)).toBe(value);
  });
  it.each([undefined, [], ["2", "3"], "", "0", "21", "-1", "2.5", "NaN", "Infinity", "2people", "1e1", " 2 "])("falls back to household portions for %j", (value) => {
    expect(parseServings(value, 4)).toBe(4);
  });
  it("keeps household defaults in the same range as the detail provider", () => {
    expect(parseServings(undefined, 0)).toBe(1);
    expect(parseServings(undefined, 25)).toBe(20);
  });
});

describe("scaleQuantity", () => {
  it("keeps unknown quantities and rounds small quantities to quarters", () => {
    expect(scaleQuantity(null, 2)).toBeNull();
    expect(scaleQuantity(1, 1.3)).toBe(1.25);
    expect(scaleQuantity(3, 0.5)).toBe(1.5);
  });
  it("rounds large quantities to whole numbers", () => {
    expect(scaleQuantity(125, 1.5)).toBe(188);
  });
});

describe("withServings", () => {
  it("includes current servings with or without a plan meal", () => {
    expect(withServings("/recipes/abc/cook", 3)).toBe("/recipes/abc/cook?servings=3");
    const href = withServings("/recipes/abc/cook?meal=meal-id&servings=2", 6);
    const params = new URL(href, "https://mise.test").searchParams;
    expect(params.get("meal")).toBe("meal-id");
    expect(params.getAll("servings")).toEqual(["6"]);
  });
});
