import { describe, expect, it } from "vitest";
import { nextHref, pendingSteps, previousHref } from "./steps";

describe("pendingSteps", () => {
  it("runs household and personal steps for the first member", () => {
    expect(pendingSteps({ householdDone: false, memberDone: false })).toEqual([
      "stores", "people", "budget", "styles", "kitchen", "allergies", "dislikes", "diet",
    ]);
  });

  it("only asks personal questions to someone joining a configured household", () => {
    expect(pendingSteps({ householdDone: true, memberDone: false })).toEqual(["allergies", "dislikes", "diet"]);
  });

  it("is empty once both are done", () => {
    expect(pendingSteps({ householdDone: true, memberDone: true })).toEqual([]);
  });
});

describe("navigation", () => {
  const flow = pendingSteps({ householdDone: true, memberDone: false });

  it("moves forward and finishes", () => {
    expect(nextHref("allergies", flow, false)).toBe("/setup/dislikes");
    expect(nextHref("diet", flow, false)).toBe("/setup/done");
  });

  it("has no back link on the first step", () => {
    expect(previousHref("allergies", flow, false)).toBeNull();
    expect(previousHref("dislikes", flow, false)).toBe("/setup/allergies");
  });

  it("returns to preferences when editing", () => {
    expect(nextHref("budget", flow, true)).toBe("/profile/preferences");
    expect(previousHref("budget", flow, true)).toBe("/profile/preferences");
  });
});
