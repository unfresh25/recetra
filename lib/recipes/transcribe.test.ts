import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { retryAfterMs } = await import("./transcribe");

describe("retryAfterMs", () => {
  it("reads Groq's wait hint", () => {
    expect(retryAfterMs(null, "Please try again in 37s.")).toBe(38_000);
    expect(retryAfterMs(null, "Please try again in 1m2.5s.")).toBe(63_500);
  });
  it("falls back to Retry-After or 30 s", () => {
    expect(retryAfterMs("12", "")).toBe(13_000);
    expect(retryAfterMs(null, "")).toBe(30_000);
  });
});
