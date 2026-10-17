"use server";

import { updateTag } from "next/cache";
import { DATA_TAG } from "@/lib/cache";
import { createClient } from "@/lib/supabase/server";

/** Pins (or, with an empty brand, unpins) the brand the household always buys for an ingredient. */
export async function pinBrand(ingredientId: string, brand: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("pin_brand", { p_ingredient_id: ingredientId, p_brand: brand ?? "" });
  if (error) return { error: "No pudimos guardar la marca." };
  updateTag(DATA_TAG);
  return {};
}

/** Confirms or rejects a low-confidence product match for everyone. */
export async function reviewMatch(matchId: string, approve: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_product_match", { p_match_id: matchId, p_approve: approve });
  if (error) return { error: "No pudimos guardar tu respuesta." };
  updateTag(DATA_TAG);
  return {};
}
