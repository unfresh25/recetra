import { describe, expect, it } from "vitest";
import { swipeDirection } from "./cook-navigation";

describe("swipeDirection", () => {
  const start = { x: 100, y: 200 };
  it("moves forward on an upward swipe and backward on a downward swipe", () => {
    expect(swipeDirection(start, { x: 105, y: 140 })).toBe("next");
    expect(swipeDirection(start, { x: 95, y: 260 })).toBe("previous");
  });
  it("ignores taps, short gestures, horizontal scrolls and ambiguous diagonals", () => {
    expect(swipeDirection(start, start)).toBeNull();
    expect(swipeDirection(start, { x: 100, y: 141 })).toBeNull();
    expect(swipeDirection(start, { x: 250, y: 130 })).toBeNull();
    expect(swipeDirection(start, { x: 160, y: 130 })).toBeNull();
  });
});
