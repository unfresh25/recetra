import type { MealType } from "./types";
import { dayLabel, dayOfMonth, weekDays } from "./week";

export type PlacementWeek = {
  weekStart: string;
  slots: { day: string; mealType: MealType; title: string | null }[];
};

export function placementDays(weekStart: string, today: string) {
  return weekDays(weekStart).map((day) => ({
    day,
    label: `${dayLabel(day)} ${dayOfMonth(day)}`,
    disabled: day < today,
  }));
}

export function defaultPlacement(weekStart: string, today: string, mealTypes: readonly MealType[]) {
  const days = placementDays(weekStart, today);
  return {
    day: days.find((entry) => !entry.disabled)?.day ?? days[0]!.day,
    mealType: mealTypes[0] ?? "lunch",
  };
}
