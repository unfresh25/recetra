import { describe, expect, it } from "vitest";
import { defaultPlacement, placementDays } from "./placement";

describe("recipe placement", () => {
  it("defaults to today and the recipe's first meal type", () => {
    expect(defaultPlacement("2026-10-26", "2026-10-29", ["dinner", "breakfast"])).toEqual({ day: "2026-10-29", mealType: "dinner" });
  });
  it("defaults to Monday for next week, including month boundaries", () => {
    expect(defaultPlacement("2026-11-02", "2026-10-29", ["breakfast"])).toEqual({ day: "2026-11-02", mealType: "breakfast" });
  });
  it("falls back to lunch for a recipe without meal types", () => {
    expect(defaultPlacement("2026-10-26", "2026-10-26", []).mealType).toBe("lunch");
  });
  it("lists all seven days with labels and disables only past days", () => {
    const days = placementDays("2026-10-26", "2026-10-29");
    expect(days.map((entry) => entry.label)).toEqual(["Lun 26", "Mar 27", "Mié 28", "Jue 29", "Vie 30", "Sáb 31", "Dom 1"]);
    expect(days.map((entry) => entry.disabled)).toEqual([true, true, true, false, false, false, false]);
    expect(days.at(-1)?.day).toBe("2026-11-01");
  });
  it("keeps Sunday selectable and next week's days enabled across year boundaries", () => {
    expect(defaultPlacement("2026-12-28", "2027-01-03", ["lunch"]).day).toBe("2027-01-03");
    expect(placementDays("2027-01-04", "2027-01-03").every((entry) => !entry.disabled)).toBe(true);
  });
});
