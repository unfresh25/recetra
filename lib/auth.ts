import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { pendingSteps } from "@/lib/onboarding/steps";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Member = Pick<
  Tables<"members">,
  "id" | "display_name" | "accent_color" | "role" | "user_id" | "onboarded_at"
>;
export type Household = Pick<
  Tables<"households">,
  | "id"
  | "name"
  | "city"
  | "onboarded_at"
  | "weekly_budget_cop"
  | "servings_adults"
  | "servings_kids"
  | "equipment"
  | "styles"
>;

/** Signed-in user id, or redirect to /login. Request-scoped (reads cookies). */
export const requireUserId = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return userId;
});

/** Current member and household, or null when the user has not joined one yet. */
export const getMembership = cache(async () => {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select(
      "id, display_name, accent_color, role, user_id, onboarded_at, households (id, name, city, onboarded_at, weekly_budget_cop, servings_adults, servings_kids, equipment, styles)",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.households) return null;

  const { households, ...member } = data;
  const household = households as Household;
  return {
    member: member as Member,
    household,
    setupFlow: pendingSteps({
      householdDone: household.onboarded_at !== null,
      memberDone: member.onboarded_at !== null,
    }),
  };
});

export type Membership = NonNullable<Awaited<ReturnType<typeof getMembership>>>;

/** Membership, or redirect to onboarding. Does not require setup to be finished. */
export const requireMembership = cache(async () => {
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");
  return membership;
});

/** Membership with setup finished, or redirect to the next pending setup step. */
export const requireReadyMembership = cache(async () => {
  const membership = await requireMembership();
  const [next] = membership.setupFlow;
  if (next) redirect(`/setup/${next}`);
  return membership;
});
