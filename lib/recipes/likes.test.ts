import { describe, expect, it } from "vitest";
import { formatLikeCount } from "./likes";

describe("formatLikeCount", () => {
  it("hides zero and formats ordinary counts", () => {
    expect(formatLikeCount(0)).toBe("");
    expect(formatLikeCount(12)).toBe("12");
    expect(formatLikeCount(999)).toBe("999");
  });
  it("uses compact Colombian Spanish numbers", () => {
    expect(formatLikeCount(1200)).toBe("1,2 mil");
    expect(formatLikeCount(12500)).toBe("12,5 mil");
    expect(formatLikeCount(1200000)).toBe("1,2 M");
  });
});
