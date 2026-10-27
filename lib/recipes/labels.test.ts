import { describe, expect, it } from "vitest";
import { formatQuantity } from "./labels";
import { scaleQuantity } from "./servings";

describe("formatQuantity", () => {
  it.each([
    [0, "0 unid."],
    [1, "1 unid."],
    [2, "2 unid."],
    [0.25, "¼ unid."],
    [0.5, "½ unid."],
    [0.75, "¾ unid."],
    [2.25, "2¼ unid."],
    [2.5, "2½ unid."],
    [2.75, "2¾ unid."],
    [2.3, "2,3 unid."],
  ])("formats %s generic units as %s", (quantity, expected) => {
    expect(formatQuantity(quantity, "unit")).toBe(expected);
  });

  it("formats scaled unit counts shared by recipe detail and cook mode", () => {
    expect(formatQuantity(scaleQuantity(3, 3 / 4), "unit")).toBe("2¼ unid.");
  });

  it.each([
    [2.25, "g", "2,25 g"],
    [0.5, "taza", "0,5 taza"],
    [125, "ml", "125 ml"],
    [2.25, null, "2,25"],
    [null, "g", "g"],
    [null, "unit", "unid."],
    [null, null, ""],
    [null, "al gusto", "al gusto"],
    [1, "al gusto", "al gusto"],
  ])("handles quantity %s and unit %s", (quantity, unit, expected) => {
    expect(formatQuantity(quantity, unit)).toBe(expected);
  });
});
