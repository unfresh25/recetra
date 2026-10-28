import { describe, expect, it } from "vitest";
import { parsePlanContext, planContextParam } from "./search-context";

const today = "2026-10-29";
describe("plan search context", () => {
  it("accepts today and next Sunday, and round-trips the context", () => {
    expect(parsePlanContext(`${today}.lunch`, today)).toEqual({ day: today, mealType: "lunch" });
    const context = parsePlanContext("2026-11-08.dinner", today)!;
    expect(planContextParam(context)).toBe("2026-11-08.dinner");
  });
  it.each([undefined, ["2026-10-29.lunch"], "2026-02-30.lunch", "2026-10-28.lunch", "2026-11-09.lunch", "2026-10-29.snack", "2026-10-29.lunch.extra", "2026-10-29"])("ignores invalid or unavailable context %s", (value) => {
    expect(parsePlanContext(value, today)).toBeNull();
  });
  it("handles next week across year boundaries", () => {
    expect(parsePlanContext("2027-01-10.breakfast", "2027-01-03")).toEqual({ day: "2027-01-10", mealType: "breakfast" });
    expect(parsePlanContext("2027-01-11.breakfast", "2027-01-03")).toBeNull();
  });
});
