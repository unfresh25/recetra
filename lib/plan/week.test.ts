import { describe, expect, it } from "vitest";
import { dayLabel, mondayOf, todayInBogota, weekDays } from "./week";

describe("week helpers", () => {
  it("uses Bogotá time for today", () => {
    expect(todayInBogota(new Date("2026-10-20T03:00:00Z"))).toBe("2026-10-19");
  });
  it("finds the Monday of the week", () => {
    expect(mondayOf("2026-10-16")).toBe("2026-10-12");
    expect(mondayOf("2026-10-19")).toBe("2026-10-19");
    expect(mondayOf("2026-10-25")).toBe("2026-10-19");
  });
  it("lists seven days with Spanish labels", () => {
    const days = weekDays("2026-10-19");
    expect(days).toHaveLength(7);
    expect(days.map((d) => dayLabel(d))).toEqual(["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]);
  });
});
