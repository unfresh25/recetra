import { describe, expect, it } from "vitest";
import { dayTotals, macroSplit, weekAverage, type CalorieMeal } from "./summary";

const meal = (day: string, kcal: number, eaten: boolean): CalorieMeal => ({
  id: `${day}-${kcal}`, day, mealType: "lunch", eaten, title: "x", kcal, protein: 30, carbs: 50, fat: 10,
});

describe("calories", () => {
  it("counts only eaten meals, but shows what was planned", () => {
    const t = dayTotals([meal("2026-10-17", 500, true), meal("2026-10-17", 700, false)], "2026-10-17");
    expect(t).toMatchObject({ kcal: 500, eaten: 1, planned: 2, plannedKcal: 1200, protein: 30 });
  });

  it("averages only logged days", () => {
    expect(weekAverage([dayTotals([meal("a", 2000, true)], "a"), dayTotals([], "b")])).toBe(2000);
    expect(weekAverage([dayTotals([], "b")])).toBeNull();
  });

  it("splits energy by macro", () => {
    const split = macroSplit({ protein: 25, carbs: 50, fat: 0 })!;
    expect(split.protein).toBeCloseTo(1 / 3);
    expect(split.fat).toBe(0);
  });
});
