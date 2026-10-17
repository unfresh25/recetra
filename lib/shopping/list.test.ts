import { describe, expect, it } from "vitest";
import { planShopping, type Need, type Offer } from "./list";

const units = { base_unit: "g" as const, purchase_unit: "g" as const, unit_weight_g: null, density_g_ml: null };
const need = (id: string, amount: number | null, extra: Partial<Need> = {}): Need => ({
  ingredientId: id, name: id, category: "grains", staple: false, amount, unit: "g", units, recipes: ["R"], ...extra,
});
const offer = (storeId: string, productId: string, packageQty: number, priceCop: number, brand: string | null = null): Offer => ({
  storeId, productId, name: productId, brand, packageQty, packageUnit: "g", priceCop, capturedAt: "2026-10-17", url: null,
});

describe("planShopping", () => {
  it("buys enough packages and picks the cheapest total per store", () => {
    const plan = planShopping(
      [need("arroz", 1200)],
      new Map([["arroz", [offer("d1", "a500", 500, 1500), offer("d1", "a1000", 1000, 2600), offer("d1", "a3000", 3000, 7000)]]]),
      ["d1"],
    );
    // 3 x 500 g = 4500, 2 x 1 kg = 5200, 1 x 3 kg = 7000.
    expect(plan.items[0]!.picks.d1).toMatchObject({ packages: 3, costCop: 4500 });
  });

  it("does not price staples and buys one package when the amount is unknown", () => {
    const plan = planShopping(
      [need("sal", 5, { staple: true }), need("oregano", null)],
      new Map([["sal", [offer("d1", "sal", 500, 1000)]], ["oregano", [offer("d1", "or", 10, 2000)]]]),
      ["d1"],
    );
    expect(plan.items[0]!.picks).toEqual({});
    expect(plan.bestSingle).toMatchObject({ totalCop: 2000, missing: 0 });
  });

  it("splits between two stores only when it saves money", () => {
    const offers = new Map([
      ["arroz", [offer("d1", "a", 1000, 2000), offer("olimpica", "b", 1000, 3000)]],
      ["pollo", [offer("d1", "c", 1000, 15000), offer("olimpica", "d", 1000, 11000)]],
    ]);
    const plan = planShopping([need("arroz", 1000), need("pollo", 1000)], offers, ["d1", "olimpica"]);
    expect(plan.bestSingle).toMatchObject({ storeIds: ["olimpica"], totalCop: 14000 });
    expect(plan.bestCombo).toMatchObject({ totalCop: 13000, assignment: { arroz: "d1", pollo: "olimpica" } });
  });

  it("prefers the store that has everything over a cheaper incomplete one", () => {
    const offers = new Map([
      ["arroz", [offer("d1", "a", 1000, 1000), offer("exito", "b", 1000, 3000)]],
      ["queso", [offer("exito", "c", 500, 9000)]],
    ]);
    const plan = planShopping([need("arroz", 1000), need("queso", 500)], offers, ["d1", "exito"]);
    expect(plan.bestSingle).toMatchObject({ storeIds: ["exito"], missing: 0 });
  });

  it("limits offers to a pinned brand", () => {
    const offers = new Map([["arroz", [offer("d1", "cheap", 1000, 2000, "Económico"), offer("d1", "diana", 1000, 3500, "Diana")]]]);
    const plan = planShopping([need("arroz", 1000)], offers, ["d1"], new Map([["arroz", "diana"]]));
    expect(plan.items[0]!.picks.d1?.offer.productId).toBe("diana");
  });

  it("charges loose goods by the weight taken", () => {
    const loose = { ...offer("d1", "ajo-kg", 1000, 12000), byWeight: true };
    const plan = planShopping([need("ajo", 112), need("pizca", 20)], new Map([["ajo", [loose]], ["pizca", [{ ...loose, productId: "p" }]]]), ["d1"]);
    // 112 g rounds up to 150 g; tiny amounts are at least 100 g.
    expect(plan.items[0]!.picks.d1).toMatchObject({ weightG: 150, costCop: 1800 });
    expect(plan.items[1]!.picks.d1).toMatchObject({ weightG: 100, costCop: 1200 });
  });

  it("converts pieces to grams when the store sells by weight", () => {
    const tomato = { base_unit: "unit" as const, purchase_unit: "unit" as const, unit_weight_g: 120, density_g_ml: null };
    const plan = planShopping(
      [need("tomate", 4, { unit: "unit", units: tomato })],
      new Map([["tomate", [offer("d1", "t", 1000, 4000)]]]),
      ["d1"],
    );
    expect(plan.items[0]!.picks.d1).toMatchObject({ packages: 1, costCop: 4000 });
  });
});
