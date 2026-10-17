import { describe, expect, it } from "vitest";
import { sanitizeRecipe, type RawRecipe } from "./recipe-schema";

const raw = (overrides: Partial<RawRecipe>): RawRecipe => ({
  is_recipe: true,
  has_ingredient_list: true,
  title: "Arepa",
  meal_types: ["breakfast"],
  servings: 2,
  total_minutes: 15,
  styles: [],
  equipment: [],
  ingredients: [],
  steps: [],
  nutrition_per_serving: { kcal: 300, protein_g: 10, carbs_g: 40, fat_g: 8 },
  confidence: 0.9,
  ...overrides,
});

describe("sanitizeRecipe", () => {
  it("maps Spanish meal names and drops unknown ones instead of failing", () => {
    expect(sanitizeRecipe(raw({ meal_types: ["Desayuno", "merienda", "brunch"] })).meal_types).toEqual(["breakfast", "dinner"]);
    expect(sanitizeRecipe(raw({ meal_types: ["brunch"] })).meal_types).toEqual(["lunch"]);
  });

  it("filters styles, equipment and allergens to known values", () => {
    const r = sanitizeRecipe(
      raw({
        styles: ["quick", "spicy"],
        equipment: ["oven", "wok"],
        ingredients: [
          {
            name_as_written: "queso",
            catalog_slug: null,
            new_ingredient: { name: "Queso de capa", category: "lácteos", base_unit: "kg", allergens: ["dairy", "lactosa"] },
            quantity: 100,
            unit: "g",
            role: "protagonista",
            note: null,
          },
        ],
      }),
    );
    expect(r.styles).toEqual(["quick"]);
    expect(r.equipment).toEqual(["oven"]);
    expect(r.ingredients[0]).toMatchObject({
      role: "core",
      new_ingredient: { category: "other", base_unit: "g", allergens: ["dairy"] },
    });
  });
});
