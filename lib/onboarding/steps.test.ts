import { describe, expect, it } from "vitest";
import { nextHref, pendingSteps, previousHref } from "./steps";

describe("pendingSteps", () => {
  it("runs household and personal steps for the first member", () => {
    expect(pendingSteps({ householdDone: false, memberDone: false })).toEqual([
      "preferences", "stores", "people", "budget", "styles", "kitchen", "allergies", "dislikes", "diet",
    ]);
  });

  it("only asks personal questions to someone joining a configured household", () => {
    expect(pendingSteps({ householdDone: true, memberDone: false })).toEqual([
      "preferences", "allergies", "dislikes", "diet",
    ]);
  });

  it("is empty once both are done", () => {
    expect(pendingSteps({ householdDone: true, memberDone: true })).toEqual([]);
  });
});

describe("navigation", () => {
  const flow = pendingSteps({ householdDone: true, memberDone: false });

  it("moves forward and finishes", () => {
    expect(nextHref("allergies", flow, false)).toBe("/setup/dislikes");
    expect(nextHref("diet", flow, false)).toBe("/plan");
  });

  it("finishes after the last step of each flow", () => {
    for (const state of [
      { householdDone: false, memberDone: false },
      { householdDone: true, memberDone: false },
      { householdDone: false, memberDone: true },
    ]) {
      const flow = pendingSteps(state);
      flow.forEach((step, index) => {
        expect(nextHref(step, flow, false)).toBe(
          index === flow.length - 1 ? "/plan" : `/setup/${flow[index + 1]}`,
        );
      });
    }
  });

  it("uses the supplied order instead of a particular final step", () => {
    expect(nextHref("diet", ["diet", "preferences"], false)).toBe("/setup/preferences");
    expect(nextHref("preferences", ["diet", "preferences"], false)).toBe("/plan");
  });

  it("has no back link on the first step", () => {
    expect(previousHref("preferences", flow, false)).toBeNull();
    expect(previousHref("allergies", flow, false)).toBe("/setup/preferences");
  });

  it("returns to preferences when editing", () => {
    expect(nextHref("budget", flow, true)).toBe("/profile/preferences");
    expect(nextHref("diet", flow, true)).toBe("/profile/preferences");
    expect(previousHref("budget", flow, true)).toBe("/profile/preferences");
  });
});
