import { describe, expect, it } from "vitest";
import { tokenizeStep } from "./step-tokens";

const ingredients = [["Cebolla larga", "cebollín"], ["Cebolla cabezona", "cebolla"], ["Tomate"], ["Pechuga de pollo", "pechuga"]];

describe("tokenizeStep", () => {
  it("finds ingredients, tools, times, temperatures and heat", () => {
    const tokens = tokenizeStep("Sofríe la cebolla y los tomates en una sartén a fuego medio por 10 minutos y hornea a 180 °C.", ingredients);
    expect(tokens.filter((t) => t.kind !== "text")).toEqual([
      { kind: "ingredient", text: "cebolla", index: 1 },
      { kind: "ingredient", text: "tomates", index: 2 },
      { kind: "tool", text: "sartén", icon: "pan" },
      { kind: "heat", text: "fuego medio" },
      { kind: "time", text: "10 minutos", seconds: 600 },
      { kind: "temperature", text: "180 °C" },
    ]);
  });

  it("prefers the longest ingredient name and keeps text intact", () => {
    const tokens = tokenizeStep("Agrega la cebolla larga picada.", ingredients);
    expect(tokens).toEqual([
      { kind: "text", text: "Agrega la " },
      { kind: "ingredient", text: "cebolla larga", index: 0 },
      { kind: "text", text: " picada." },
    ]);
  });

  it("uses the upper bound of time ranges and understands hours", () => {
    const [, range] = tokenizeStep("Cocina 10 a 15 minutos.", []);
    expect(range).toEqual({ kind: "time", text: "10 a 15 minutos", seconds: 900 });
    expect(tokenizeStep("Deja reposar 1 hora", []).at(-1)).toEqual({ kind: "time", text: "1 hora", seconds: 3600 });
  });

  it("matches without accents and picks olla a presión over olla", () => {
    const tokens = tokenizeStep("Pasa todo a la olla a presion y luego al bowl.", []);
    expect(tokens.filter((t) => t.kind === "tool")).toEqual([
      { kind: "tool", text: "olla a presion", icon: "pot" },
      { kind: "tool", text: "bowl", icon: "rice-bowl" },
    ]);
  });
});
