import "server-only";
import sharp from "sharp";
import { ExtractionError, extractRecipe, type ExtractedRecipe } from "@/lib/ai/recipe-extraction";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, TablesInsert } from "@/lib/supabase/database.types";
import { MetadataError, fetchVideoMetadata, type VideoMetadata } from "./metadata";
import { parseRecipeUrl } from "./source";
import { dispatchImportWorker } from "./dispatch";
import { thumbPath } from "./images";
import { normalizeUnit, slugify } from "./units";

type Admin = ReturnType<typeof createAdminClient>;

export type ImportPayload = {
  url: string;
  visibility: "public" | "household";
  /** Filled by the GitHub Actions worker when it had to read the audio or an Instagram post. */
  worker?: { metadata?: VideoMetadata; transcript?: string };
  /** Catalog seeding: approve confident recipes directly, discard the rest, never wait for the worker. */
  seed?: boolean;
};

/** Stage reported to the inbox while a job is not finished. */
export type ImportResult =
  | { stage: "done"; recipe_id: string; existing?: boolean }
  | { stage: "needs_worker"; reason: "instagram" | "audio" }
  | { stage: "failed"; reason: "unsupported" | "not_found" | "not_a_recipe" | "low_confidence" | "ai" | "unknown" };

const SEED_MIN_CONFIDENCE = 0.75;

/**
 * Processes one import job end to end: metadata → dedupe → Haiku → catalog writes → thumbnail.
 * Safe to call more than once; it exits early when the job is not runnable.
 */
export async function processImportJob(jobId: string): Promise<ImportResult | null> {
  const db = createAdminClient();
  const { data: job } = await db.from("jobs").select("*").eq("id", jobId).single();
  if (!job || job.kind !== "import_recipe" || job.status === "done" || job.status === "running") return null;

  await db.from("jobs").update({ status: "running", attempts: job.attempts + 1 }).eq("id", jobId);
  const payload = job.payload as unknown as ImportPayload;

  let result: ImportResult;
  try {
    result = await runImport(db, payload, job.household_id);
  } catch (error) {
    console.error("import failed", jobId, error);
    // No silent auto-retry: the inbox shows the failure and the household decides to retry.
    // Worker output (metadata, transcript) stays in the payload, so a retry skips that work.
    await db
      .from("jobs")
      .update({
        status: "failed",
        last_error: error instanceof Error ? error.message.slice(0, 500) : String(error),
        result: { stage: "failed", reason: error instanceof ExtractionError ? "ai" : "unknown" } satisfies ImportResult,
      })
      .eq("id", jobId);
    return null;
  }

  const status = result.stage === "done" ? "done" : result.stage === "needs_worker" ? "queued" : "failed";
  // Seeds transcribe in the seed script itself; household imports wake the worker.
  if (result.stage === "needs_worker" && !payload.worker && !payload.seed) await dispatchImportWorker();
  await db
    .from("jobs")
    .update({ status, result: result as unknown as Json, last_error: null })
    .eq("id", jobId);
  return result;
}

async function runImport(db: Admin, payload: ImportPayload, householdId: string | null): Promise<ImportResult> {
  const source = parseRecipeUrl(payload.url);
  if (!source) return { stage: "failed", reason: "unsupported" };

  let metadata = payload.worker?.metadata;
  if (!metadata) {
    try {
      metadata = await fetchVideoMetadata(source);
    } catch (error) {
      if (error instanceof MetadataError) {
        if (error.reason === "needs_worker") {
          return payload.seed ? { stage: "failed", reason: "unsupported" } : { stage: "needs_worker", reason: "instagram" };
        }
        if (error.reason === "not_found") return { stage: "failed", reason: "not_found" };
      }
      throw error;
    }
  }

  const existing = await db
    .from("recipes")
    .select("id")
    .eq("source_platform", metadata.platform)
    .eq("source_video_id", metadata.videoId)
    .maybeSingle();
  if (existing.data) return { stage: "done", recipe_id: existing.data.id, existing: true };

  const { data: catalog } = await db.from("ingredients").select("slug, name").eq("status", "active");
  const extracted = await extractRecipe({
    title: metadata.title,
    text: metadata.text,
    transcript: payload.worker?.transcript,
    authorName: metadata.authorName,
    durationSeconds: metadata.durationSeconds,
    catalog: catalog ?? [],
  });

  if (!extracted.is_recipe) return { stage: "failed", reason: "not_a_recipe" };
  const incomplete = !extracted.has_ingredient_list || extracted.steps.length === 0;
  const transcribed = Boolean(payload.worker?.transcript);
  if (incomplete && !transcribed) {
    // The caption lacks the ingredients or the steps: the worker will transcribe the audio and retry.
    return { stage: "needs_worker", reason: "audio" };
  }
  // Seeds only keep recipes we are confident about, even after listening to the audio.
  if (payload.seed && (incomplete || extracted.confidence < SEED_MIN_CONFIDENCE)) {
    return { stage: "failed", reason: "low_confidence" };
  }

  const recipeId = await saveRecipe(db, metadata, extracted, payload.visibility, householdId, payload.seed ? "approved" : "pending_review");
  return { stage: "done", recipe_id: recipeId };
}

async function resolveIngredientIds(db: Admin, extracted: ExtractedRecipe): Promise<(string | null)[]> {
  const slugs = new Set<string>();
  for (const item of extracted.ingredients) {
    if (item.catalog_slug) slugs.add(item.catalog_slug);
    else if (item.new_ingredient) slugs.add(slugify(item.new_ingredient.name));
  }

  const { data: known } = await db.from("ingredients").select("id, slug").in("slug", [...slugs]);
  const bySlug = new Map((known ?? []).map((row) => [row.slug, row.id]));

  // New ingredients enter the catalog as pending_review until a human confirms them.
  const missing: TablesInsert<"ingredients">[] = [];
  for (const item of extracted.ingredients) {
    if (item.catalog_slug || !item.new_ingredient) continue;
    const slug = slugify(item.new_ingredient.name);
    if (!slug || bySlug.has(slug) || missing.some((m) => m.slug === slug)) continue;
    missing.push({
      slug,
      name: item.new_ingredient.name,
      category: item.new_ingredient.category,
      base_unit: item.new_ingredient.base_unit,
      allergens: item.new_ingredient.allergens,
      status: "pending_review",
    });
  }
  if (missing.length) {
    const { data: inserted, error } = await db
      .from("ingredients")
      .upsert(missing, { onConflict: "slug", ignoreDuplicates: false })
      .select("id, slug");
    if (error) throw error;
    for (const row of inserted ?? []) bySlug.set(row.slug, row.id);
  }

  return extracted.ingredients.map((item) => {
    const slug = item.catalog_slug ?? (item.new_ingredient ? slugify(item.new_ingredient.name) : null);
    return slug ? (bySlug.get(slug) ?? null) : null;
  });
}

async function saveRecipe(
  db: Admin,
  metadata: VideoMetadata,
  extracted: ExtractedRecipe,
  visibility: ImportPayload["visibility"],
  householdId: string | null,
  status: "approved" | "pending_review",
): Promise<string> {
  const ingredientIds = await resolveIngredientIds(db, extracted);
  const n = extracted.nutrition_per_serving;
  const clamp = (v: number | null | undefined, max: number) =>
    v === null || v === undefined || !Number.isFinite(v) ? null : Math.min(Math.max(Math.round(v), 0), max);

  const { data: recipe, error } = await db
    .from("recipes")
    .insert({
      title: extracted.title.slice(0, 160) || metadata.title.slice(0, 160),
      source_platform: metadata.platform,
      source_video_id: metadata.videoId,
      source_url: metadata.url,
      author_name: metadata.authorName,
      author_handle: metadata.authorHandle,
      author_url: metadata.authorUrl,
      servings: clamp(extracted.servings, 24) || 2,
      total_minutes: clamp(extracted.total_minutes, 1440) || null,
      kcal_per_serving: clamp(n.kcal, 10_000),
      protein_g: clamp(n.protein_g, 1000),
      carbs_g: clamp(n.carbs_g, 1000),
      fat_g: clamp(n.fat_g, 1000),
      nutrition_estimated: true,
      meal_types: extracted.meal_types.length ? [...new Set(extracted.meal_types)] : ["lunch"],
      styles: [...new Set(extracted.styles)],
      equipment: [...new Set(extracted.equipment)],
      visibility,
      imported_by_household_id: householdId,
      status,
      ai_confidence: Math.min(Math.max(extracted.confidence, 0), 1),
    })
    .select("id")
    .single();
  if (error || !recipe) throw error ?? new Error("Recipe insert failed");

  try {
    const ingredients = extracted.ingredients.flatMap((item, index) => {
      const ingredientId = ingredientIds[index];
      if (!ingredientId) return [];
      return [
        {
          recipe_id: recipe.id,
          position: index + 1,
          ingredient_id: ingredientId,
          quantity: item.quantity && item.quantity > 0 ? item.quantity : null,
          unit: normalizeUnit(item.unit),
          role: item.role,
          note: item.note,
        },
      ];
    });
    const steps = extracted.steps.map((step, index) => ({
      recipe_id: recipe.id,
      position: index + 1,
      text: step.text,
      video_start_seconds:
        step.video_start_seconds !== null && step.video_start_seconds >= 0 ? Math.round(step.video_start_seconds) : null,
    }));
    if (ingredients.length) {
      const { error: e } = await db.from("recipe_ingredients").insert(ingredients);
      if (e) throw e;
    }
    if (steps.length) {
      const { error: e } = await db.from("recipe_steps").insert(steps);
      if (e) throw e;
    }
    const imagePath = await storeThumbnail(db, recipe.id, metadata.thumbnailUrl);
    if (imagePath) await db.from("recipes").update({ source_image_path: imagePath }).eq("id", recipe.id);
  } catch (e) {
    await db.from("recipes").delete().eq("id", recipe.id);
    throw e;
  }
  return recipe.id;
}

/** Copies the (often expiring) platform thumbnail into Storage as WebP, full size plus a list thumbnail. */
async function storeThumbnail(db: Admin, recipeId: string, url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const original = Buffer.from(await res.arrayBuffer());
    const [full, thumb] = await Promise.all([
      sharp(original).resize(1080, 1080, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
      sharp(original).resize(400, 400, { fit: "cover" }).webp({ quality: 75 }).toBuffer(),
    ]);
    const path = `recipes/${recipeId}.webp`;
    const bucket = db.storage.from("recipe-images");
    const [a, b] = await Promise.all([
      bucket.upload(path, full, { contentType: "image/webp", upsert: true }),
      bucket.upload(thumbPath(path), thumb, { contentType: "image/webp", upsert: true }),
    ]);
    return a.error || b.error ? null : path;
  } catch {
    return null;
  }
}
