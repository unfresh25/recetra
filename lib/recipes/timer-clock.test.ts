import { describe, expect, it } from "vitest";
import { formatClock } from "./timer-clock";

describe("formatClock", () => {
  it("shows a two-digit countdown and rounds partial seconds up", () => {
    expect(formatClock(420)).toBe("07:00");
    expect(formatClock(59.1)).toBe("01:00");
    expect(formatClock(1.1)).toBe("00:02");
  });
  it("keeps hours readable and expired timers at zero", () => {
    expect(formatClock(3661)).toBe("1:01:01");
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(-25)).toBe("00:00");
  });
});
