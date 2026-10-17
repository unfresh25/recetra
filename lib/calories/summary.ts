/** Pure calorie math over a week of planned meals. One serving per person per eaten meal. */
export type CalorieMeal = {
  id: string;
  day: string;
  mealType: "breakfast" | "lunch" | "dinner";
  eaten: boolean;
  title: string;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

export type DayTotals = { day: string; kcal: number; protein: number; carbs: number; fat: number; eaten: number; planned: number; plannedKcal: number };

export function dayTotals(meals: CalorieMeal[], day: string): DayTotals {
  const ofDay = meals.filter((m) => m.day === day);
  const eaten = ofDay.filter((m) => m.eaten);
  const sum = (list: CalorieMeal[], key: "kcal" | "protein" | "carbs" | "fat") => Math.round(list.reduce((t, m) => t + (m[key] ?? 0), 0));
  return {
    day,
    kcal: sum(eaten, "kcal"),
    protein: sum(eaten, "protein"),
    carbs: sum(eaten, "carbs"),
    fat: sum(eaten, "fat"),
    eaten: eaten.length,
    planned: ofDay.length,
    plannedKcal: sum(ofDay, "kcal"),
  };
}

/** Average over days with at least one eaten meal, so unlogged days don't drag it down. */
export function weekAverage(days: DayTotals[]) {
  const logged = days.filter((d) => d.eaten > 0);
  return logged.length ? Math.round(logged.reduce((t, d) => t + d.kcal, 0) / logged.length) : null;
}

/** Share of energy from each macro (4/4/9 kcal per gram). */
export function macroSplit(t: Pick<DayTotals, "protein" | "carbs" | "fat">) {
  const energy = t.protein * 4 + t.carbs * 4 + t.fat * 9;
  if (!energy) return null;
  return { protein: (t.protein * 4) / energy, carbs: (t.carbs * 4) / energy, fat: (t.fat * 9) / energy };
}
