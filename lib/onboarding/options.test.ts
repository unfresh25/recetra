import { describe, expect, it } from "vitest";
import { formatCopK } from "./options";

describe("formatCopK", () => {
  it.each([
    [80_000, "$80k"],
    [250_000, "$250k"],
    [83_333, "$83k"],
    [800_000, "$800k"],
  ])("formats %i COP as %s", (cop, formatted) => {
    expect(formatCopK(cop)).toBe(formatted);
  });
});
