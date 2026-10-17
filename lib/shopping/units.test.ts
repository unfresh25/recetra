import { describe, expect, it } from "vitest";
import { toBuyAmount, type IngredientUnits } from "./units";

const rice: IngredientUnits = { base_unit: "g", purchase_unit: "g", unit_weight_g: null, density_g_ml: 0.85 };
const egg: IngredientUnits = { base_unit: "unit", purchase_unit: "unit", unit_weight_g: 50, density_g_ml: null };
const garlic: IngredientUnits = { base_unit: "g", purchase_unit: "g", unit_weight_g: 40, density_g_ml: null };
const onion: IngredientUnits = { base_unit: "unit", purchase_unit: "g", unit_weight_g: 150, density_g_ml: null };
const milk: IngredientUnits = { base_unit: "ml", purchase_unit: "ml", unit_weight_g: null, density_g_ml: 1.03 };

describe("toBuyAmount", () => {
  it("keeps grams and converts kilos and Colombian pounds", () => {
    expect(toBuyAmount(200, "g", rice)).toEqual({ amount: 200, unit: "g" });
    expect(toBuyAmount(1, "lb", rice)).toEqual({ amount: 500, unit: "g" });
    expect(toBuyAmount(0.5, "kilos", rice)).toEqual({ amount: 500, unit: "g" });
  });

  it("turns cups and spoons into grams with the density", () => {
    expect(toBuyAmount(2, "tazas", rice)).toEqual({ amount: 408, unit: "g" });
    expect(toBuyAmount(1, "cda", milk)).toEqual({ amount: 15, unit: "ml" });
  });

  it("counts pieces and weighs them when sold by weight", () => {
    expect(toBuyAmount(3, "unidades", egg)).toEqual({ amount: 3, unit: "unit" });
    expect(toBuyAmount(1, "unit", onion)).toEqual({ amount: 150, unit: "g" });
    expect(toBuyAmount(3, "dientes", garlic)).toEqual({ amount: 15, unit: "g" });
  });

  it("turns weight back into pieces when sold by unit", () => {
    expect(toBuyAmount(100, "g", egg)).toEqual({ amount: 2, unit: "unit" });
  });

  it("counts broth by the litre as cubes", () => {
    const broth: IngredientUnits = { name: "Caldo de gallina", base_unit: "unit", purchase_unit: "unit", unit_weight_g: 10, density_g_ml: null };
    expect(toBuyAmount(1000, "ml", broth)).toEqual({ amount: 2, unit: "unit" });
    expect(toBuyAmount(0.5, "taza", broth)).toEqual({ amount: 1, unit: "unit" });
  });

  it("leaves unmeasured amounts out", () => {
    expect(toBuyAmount(null, "al gusto", rice)).toBeNull();
    expect(toBuyAmount(1, "pizca", rice)).toBeNull();
    expect(toBuyAmount(1, "unit", rice)).toBeNull();
  });
});
