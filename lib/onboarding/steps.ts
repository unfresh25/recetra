export const HOUSEHOLD_STEPS = ["stores", "people", "budget", "styles", "kitchen"] as const;
export const MEMBER_STEPS = ["allergies", "dislikes", "diet"] as const;

export type HouseholdStep = (typeof HOUSEHOLD_STEPS)[number];
export type MemberStep = (typeof MEMBER_STEPS)[number];
export type SetupStep = HouseholdStep | MemberStep;

export const ALL_STEPS: readonly SetupStep[] = [...HOUSEHOLD_STEPS, ...MEMBER_STEPS];

export function isSetupStep(value: string): value is SetupStep {
  return (ALL_STEPS as readonly string[]).includes(value);
}

/** Steps this member still has to go through, in order. */
export function pendingSteps(state: { householdDone: boolean; memberDone: boolean }): SetupStep[] {
  return [
    ...(state.householdDone ? [] : HOUSEHOLD_STEPS),
    ...(state.memberDone ? [] : MEMBER_STEPS),
  ];
}

/** Where to go after saving `step`. In edit mode we always return to the preferences screen. */
export function nextHref(step: SetupStep, flow: readonly SetupStep[], edit: boolean): string {
  if (edit) return "/profile/preferences";
  const index = flow.indexOf(step);
  const next = flow[index + 1];
  return next ? `/setup/${next}` : "/setup/done";
}

export function previousHref(step: SetupStep, flow: readonly SetupStep[], edit: boolean): string | null {
  if (edit) return "/profile/preferences";
  const index = flow.indexOf(step);
  return index > 0 ? `/setup/${flow[index - 1]}` : null;
}
