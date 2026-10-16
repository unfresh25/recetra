import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Member = Pick<Tables<"members">, "id" | "display_name" | "accent_color" | "role" | "user_id">;
export type Household = Pick<Tables<"households">, "id" | "name" | "city">;

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
    .select("id, display_name, accent_color, role, user_id, households (id, name, city)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.households) return null;

  const { households, ...member } = data;
  return { member: member as Member, household: households as Household };
});

/** Membership, or redirect to onboarding. */
export const requireMembership = cache(async () => {
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");
  return membership;
});
