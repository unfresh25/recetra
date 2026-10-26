import "server-only";
import { redirect } from "next/navigation";
import { privateData } from "@/lib/cache";
import { pendingSteps } from "@/lib/onboarding/steps";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Member = Pick<
  Tables<"members">,
  | "id"
  | "display_name"
  | "accent_color"
  | "role"
  | "user_id"
  | "onboarded_at"
  | "measurement_system"
  | "temperature_unit"
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
export async function requireUserId(): Promise<string> {
  "use cache: private";
  privateData();
  const supabase = await createClient({ privateCache: true });
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return userId;
}

/** Signed-in user's id and email (for screens that show the account email). */
export async function requireUserIdentity(): Promise<{ id: string; email: string }> {
  "use cache: private";
  privateData();
  const supabase = await createClient({ privateCache: true });
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
}

/** Current member and household, or null when the user has not joined one yet. */
export async function getMembership() {
  "use cache: private";
  privateData();
  const userId = await requireUserId();
  const supabase = await createClient({ privateCache: true });
  const { data, error } = await supabase
    .from("members")
    .select(
      "id, display_name, accent_color, role, user_id, onboarded_at, measurement_system, temperature_unit, households (id, name, city, onboarded_at, weekly_budget_cop, servings_adults, servings_kids, equipment, styles)",
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
}

export type Membership = NonNullable<Awaited<ReturnType<typeof getMembership>>>;

/** Membership, or redirect to onboarding. Does not require setup to be finished. */
export async function requireMembership() {
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");
  return membership;
}

/** Membership with setup finished, or redirect to the next pending setup step. */
export async function requireReadyMembership() {
  const membership = await requireMembership();
  const [next] = membership.setupFlow;
  if (next) redirect(`/setup/${next}`);
  return membership;
}
