import { describe, expect, it } from "vitest";
import { parsePackage } from "./package";

describe("parsePackage", () => {
  it.each([
    ["Arroz Mi Arroz 454 G", { qty: 454, unit: "g" }],
    ["Arroz Mi Arroz 3 Kg", { qty: 3000, unit: "g" }],
    ["ARROZ TAILANDES 2.500 G", { qty: 2500, unit: "g" }],
    ["Arroz blanco SONORA Tradicional (450  gr)", { qty: 450, unit: "g" }],
    ["Huevos Rojos Avinal Tipo A x 30 unds", { qty: 30, unit: "unit" }],
    ["Atún Megatiendas Lomitos en Agua x 175 g", { qty: 175, unit: "g" }],
    ["Leche Entera Alquería 1,1 L", { qty: 1100, unit: "ml" }],
    ["Aceite de Girasol 1.5 lt", { qty: 1500, unit: "ml" }],
    ["Yogur Alpina 6 x 200 ml", { qty: 1200, unit: "ml" }],
    ["Carne molida x 1 lb", { qty: 500, unit: "g" }],
    ["ARROZ  O 500 GRS", { qty: 500, unit: "g" }],
  ])("%s", (name, expected) => {
    expect(parsePackage(name)).toEqual(expected);
  });

  it("returns null when there is no size", () => {
    expect(parsePackage("Cebolla cabezona blanca")).toBeNull();
  });
});
