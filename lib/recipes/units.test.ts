import { describe, expect, it } from "vitest";
import { normalizeUnit, slugify } from "./units";

describe("normalizeUnit", () => {
  it.each([
    ["Gramos", "g"],
    ["cucharadas", "cda"],
    ["cdta.", "cdta"],
    ["Unidades", "unit"],
    [" Al gusto ", "al gusto"],
    ["manojo", "manojo"],
    [null, null],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeUnit(input)).toBe(expected);
  });
});

describe("slugify", () => {
  it("removes accents and symbols", () => {
    expect(slugify("Queso Costeño (rallado)")).toBe("queso-costeno-rallado");
    expect(slugify("  Ñame  ")).toBe("name");
  });
});
