export const HOUSEHOLD_STEPS = ["stores", "people", "budget", "styles", "kitchen"] as const;
export const MEMBER_STEPS = ["preferences", "allergies", "dislikes", "diet"] as const;

export type HouseholdStep = (typeof HOUSEHOLD_STEPS)[number];
export type MemberStep = (typeof MEMBER_STEPS)[number];
export type SetupStep = HouseholdStep | MemberStep;

export const ALL_STEPS: readonly SetupStep[] = [...HOUSEHOLD_STEPS, ...MEMBER_STEPS];

export function isSetupStep(value: string): value is SetupStep {
  return (ALL_STEPS as readonly string[]).includes(value);
}

/**
 * Steps this member still has to go through, in order. Kitchen units come first: they are
 * personal, but they follow "Cuéntanos acerca de ti" before any household question.
 */
export function pendingSteps(state: { householdDone: boolean; memberDone: boolean }): SetupStep[] {
  const [units, ...personal] = MEMBER_STEPS;
  return [
    ...(state.memberDone ? [] : [units]),
    ...(state.householdDone ? [] : HOUSEHOLD_STEPS),
    ...(state.memberDone ? [] : personal),
  ];
}

/** Where to go after saving `step`. In edit mode we always return to the preferences screen. */
export function nextHref(step: SetupStep, flow: readonly SetupStep[], edit: boolean): string {
  if (edit) return "/profile/preferences";
  const index = flow.indexOf(step);
  const next = flow[index + 1];
  return next ? `/setup/${next}` : "/plan";
}

export function previousHref(step: SetupStep, flow: readonly SetupStep[], edit: boolean): string | null {
  if (edit) return "/profile/preferences";
  const index = flow.indexOf(step);
  return index > 0 ? `/setup/${flow[index - 1]}` : null;
}

/**
 * Screens before /setup: "about" for everyone, then "household" for whoever creates one
 * (invited members join an existing household instead).
 */
export const INTRO_STEPS = ["about", "household"] as const;

/**
 * Completion of the whole onboarding at a given screen, 0–1. `position` is 1-based over
 * intro + setup screens, so the first screen already shows a sliver of progress.
 */
export function onboardingProgress(position: number, total: number): number {
  return Math.min(1, Math.max(0, position / (total + 1)));
}

/** Total screens for someone who creates a household: intro + every setup step. */
export const OWNER_ONBOARDING_TOTAL = INTRO_STEPS.length + ALL_STEPS.length;
