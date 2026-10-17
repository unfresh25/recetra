"use server";

import { updateTag } from "next/cache";
import { DATA_TAG } from "@/lib/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireReadyMembership } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { processImportJob, type ImportPayload } from "./import";
import { parseRecipeUrl } from "./source";

export type ImportResponse = { recipeId?: string; jobId?: string; error?: string };

export async function importRecipe(url: string, visibility: "public" | "household"): Promise<ImportResponse> {
  const { household } = await requireReadyMembership();
  const source = parseRecipeUrl(url);
  if (!source) return { error: "Pega un link de TikTok, Instagram o YouTube." };

  // Already in the catalog: reuse it instead of spending another AI call.
  const supabase = await createClient();
  if (source.videoId) {
    const { data } = await supabase
      .from("recipes")
      .select("id")
      .eq("source_platform", source.platform)
      .eq("source_video_id", source.videoId)
      .maybeSingle();
    if (data) return { recipeId: data.id };
  }

  const db = createAdminClient();
  const payload: ImportPayload = { url: source.url, visibility };
  const { data: job, error } = await db
    .from("jobs")
    .insert({ kind: "import_recipe", household_id: household.id, payload })
    .select("id")
    .single();
  if (error || !job) return { error: "No pudimos empezar la importación. Intenta de nuevo." };

  // Keep the response fast: the AI work runs after it is sent.
  after(() => processImportJob(job.id));
  updateTag(DATA_TAG);
  return { jobId: job.id };
}

export async function retryImport(jobId: string) {
  const { household } = await requireReadyMembership();
  const db = createAdminClient();
  const { data: job } = await db.from("jobs").select("id, household_id, status").eq("id", jobId).single();
  if (!job || job.household_id !== household.id || job.status !== "failed") return;
  await db.from("jobs").update({ status: "queued", attempts: 0, last_error: null, result: null }).eq("id", jobId);
  after(() => processImportJob(jobId));
  updateTag(DATA_TAG);
}

export async function dismissJob(jobId: string) {
  const { household } = await requireReadyMembership();
  const db = createAdminClient();
  await db.from("jobs").delete().eq("id", jobId).eq("household_id", household.id).neq("status", "running");
  updateTag(DATA_TAG);
}

const mealTypes = z.array(z.enum(Constants.public.Enums.meal_type)).min(1);

export async function reviewRecipe(recipeId: string, approve: boolean, meals?: string[]): Promise<{ error?: string }> {
  await requireReadyMembership();
  const parsedMeals = meals ? mealTypes.safeParse(meals) : null;
  if (parsedMeals && !parsedMeals.success) return { error: "Elige al menos un momento del día." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_recipe", {
    p_recipe_id: recipeId,
    p_approve: approve,
    p_meal_types: parsedMeals?.data,
  });
  if (error) return { error: "No pudimos guardar la revisión." };
  updateTag(DATA_TAG);
  return {};
}

export async function setIngredientRole(recipeId: string, position: number, role: "core" | "accessory") {
  await requireReadyMembership();
  const supabase = await createClient();
  await supabase.rpc("set_recipe_ingredient_role", { p_recipe_id: recipeId, p_position: position, p_role: role });
  updateTag(DATA_TAG);
}

/** Saves (or clears, with null) the household's custom cover after the browser uploaded it. */
export async function setCover(recipeId: string, path: string | null): Promise<{ error?: string }> {
  const { household } = await requireReadyMembership();
  if (path && !path.startsWith(`covers/${household.id}/`)) return { error: "Ruta inválida." };
  const supabase = await createClient();
  const { error } = path
    ? await supabase
        .from("household_recipe_overrides")
        .upsert({ household_id: household.id, recipe_id: recipeId, cover_image_path: path, updated_at: new Date().toISOString() })
    : await supabase.from("household_recipe_overrides").delete().eq("household_id", household.id).eq("recipe_id", recipeId);
  if (error) return { error: "No pudimos cambiar la portada." };
  updateTag(DATA_TAG);
  return {};
}
