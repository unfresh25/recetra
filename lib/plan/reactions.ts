import type { Enums } from "@/lib/supabase/database.types";
import type { ReactionSummary } from "./types";

export type ReactionRow = {
  member_id: string;
  recipe_id: string;
  kind: Enums<"reaction_kind">;
  reason: Enums<"replace_reason"> | null;
  created_at: string;
};

const HALF_LIFE_DAYS = 60;

const WEIGHTS: Partial<Record<Enums<"reaction_kind">, number>> = {
  favorite: 3,
  cooked: 1,
  dislike: -3,
};

function decay(createdAt: string, now: Date) {
  const days = (now.getTime() - new Date(createdAt).getTime()) / 86_400_000;
  return Math.pow(0.5, Math.max(days, 0) / HALF_LIFE_DAYS);
}

/** Reduces raw reactions into per-recipe, per-member summaries with time decay (design doc §5). */
export function summarizeReactions(rows: ReactionRow[], now = new Date()) {
  const out: Record<string, Record<string, ReactionSummary>> = {};
  for (const row of rows) {
    const byMember = (out[row.recipe_id] ??= {});
    const summary = (byMember[row.member_id] ??= { favorite: false, veto: false, score: 0 });
    if (row.kind === "favorite") summary.favorite = true;
    if (row.kind === "veto") summary.veto = true;
    // Replacing for "no me gusta" counts as a dislike; other reasons don't judge the recipe.
    const weight = row.kind === "replaced" ? (row.reason === "dislike" ? -3 : 0) : (WEIGHTS[row.kind] ?? 0);
    // Favorites are a standing preference: no decay.
    summary.score += row.kind === "favorite" ? weight : weight * decay(row.created_at, now);
  }
  return out;
}

/** Days since each recipe was last cooked by anyone in the household. */
export function daysSinceCooked(rows: ReactionRow[], now = new Date()) {
  const out: Record<string, number> = {};
  for (const row of rows) {
    if (row.kind !== "cooked") continue;
    const days = Math.floor((now.getTime() - new Date(row.created_at).getTime()) / 86_400_000);
    out[row.recipe_id] = Math.min(out[row.recipe_id] ?? Infinity, days);
  }
  return out;
}
