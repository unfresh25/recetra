import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireMembership: vi.fn(),
  createClient: vi.fn(),
  updateTag: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireMembership: mocks.requireMembership }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { DATA_TAG } from "@/lib/cache";
import { finishSetup } from "./actions";

function updateQuery() {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockResolvedValue({ error: null }),
  };
}

describe("finishSetup", () => {
  const redirectError = new Error("redirect:/plan");
  let households: ReturnType<typeof updateQuery>;
  let members: ReturnType<typeof updateQuery>;
  let from: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    households = updateQuery();
    members = updateQuery();
    from = vi.fn((table: string) => (table === "households" ? households : members));
    mocks.createClient.mockResolvedValue({ from });
    mocks.requireMembership.mockResolvedValue({
      household: { id: "household-id", onboarded_at: null },
      member: { id: "member-id", onboarded_at: null },
    });
    mocks.redirect.mockImplementation(() => {
      throw redirectError;
    });
  });

  it.each([
    { householdDone: false, memberDone: false },
    { householdDone: true, memberDone: false },
    { householdDone: false, memberDone: true },
    { householdDone: true, memberDone: true },
  ])("preserves existing completion dates: %o", async ({ householdDone, memberDone }) => {
    const existing = "2026-10-01T00:00:00.000Z";
    mocks.requireMembership.mockResolvedValue({
      household: { id: "household-id", onboarded_at: householdDone ? existing : null },
      member: { id: "member-id", onboarded_at: memberDone ? existing : null },
    });

    await expect(finishSetup()).rejects.toBe(redirectError);

    for (const [query, done, id] of [
      [households, householdDone, "household-id"],
      [members, memberDone, "member-id"],
    ] as const) {
      expect(query.update).toHaveBeenCalledTimes(done ? 0 : 1);
      if (!done) {
        expect(query.update).toHaveBeenCalledWith({ onboarded_at: expect.any(String) });
        expect(query.eq).toHaveBeenCalledWith("id", id);
        expect(query.is).toHaveBeenCalledWith("onboarded_at", null);
        expect(query.is.mock.invocationCallOrder[0]).toBeLessThan(mocks.updateTag.mock.invocationCallOrder[0]);
      }
    }
    if (!householdDone && !memberDone) {
      expect(households.update.mock.calls[0]).toEqual(members.update.mock.calls[0]);
    }
    expect(mocks.updateTag).toHaveBeenCalledWith(DATA_TAG);
    expect(mocks.updateTag.mock.invocationCallOrder[0]).toBeLessThan(mocks.redirect.mock.invocationCallOrder[0]);
    expect(mocks.redirect).toHaveBeenCalledWith("/plan");
  });

  it.each(["households", "members"])("stays in setup if updating %s fails", async (table) => {
    const query = table === "households" ? households : members;
    query.is.mockResolvedValue({ error: { message: "Write failed" } });

    await expect(finishSetup()).resolves.toEqual({
      error: "No pudimos terminar la configuración. Intenta de nuevo.",
    });

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.updateTag).toHaveBeenCalledWith(DATA_TAG);
    if (table === "households") expect(members.update).not.toHaveBeenCalled();
  });
});
