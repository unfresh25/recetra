/**
 * Seeds the public catalog with Colombian recipes from YouTube.
 * Only confident recipes whose description lists the ingredients are kept (auto-approved).
 *
 * Run with: bun --conditions=react-server jobs/seed-youtube.ts [--limit 300] [--per-query 8] [--dry-run]
 *   --audio-minutes 420   max audio to transcribe per run (Groq free plan: 480 min/day).
 *                         With TRANSCRIBE_BACKEND=local (mlx-whisper on a Mac) there is no daily cap.
 *   --channels UCxxx,UCyyy [--per-channel 150]  walk channel uploads instead of searching
 *                                              (1 quota unit per 50 videos instead of 100 per search)
 *   --meal breakfast   only run that meal's searches; combines with --channels
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdminClient } from "../lib/supabase/admin";
import { processImportJob, type ImportPayload } from "../lib/recipes/import";
import { MAX_AUDIO_SECONDS, downloadAudio, readInfo, toMetadata } from "../lib/recipes/media";
import { transcribeAudio } from "../lib/recipes/transcribe";
import type { Json } from "../lib/supabase/database.types";

const QUERIES: Record<"breakfast" | "lunch" | "dinner", string[]> = {
  breakfast: [
    "calentado paisa receta",
    "huevos pericos receta colombiana",
    "arepa de huevo receta",
    "changua receta",
    "caldo de costilla receta",
    "arepas rellenas desayuno receta",
    "desayuno colombiano fácil receta",
    "pandebono casero receta",
    "tamal tolimense receta",
    "avena colombiana receta",
    "huevos rancheros receta fácil",
    "desayuno saludable alto en proteína receta",
    "carimañolas receta",
    "bollo limpio con queso costeño",
    "butifarra soledeña receta",
    "cayeye costeño receta",
    "deditos de queso receta",
    "empanada de huevo costeña receta",
    "arepa de queso costeña receta",
    "patacón con huevo desayuno",
    "huevos con tomate y cebolla receta",
    "arepa de maíz pelao receta",
    "almojábanas receta casera",
    "buñuelos colombianos receta",
    "migas colombianas desayuno receta",
    "caldo de pescado desayuno costeño",
    "arepa de yuca receta",
    "pastel de pollo hojaldre receta",
    "huevos revueltos con salchicha receta",
    "chocolate santafereño con queso",
    "tostadas francesas receta fácil",
    "pancakes de avena receta",
    "omelette de verduras receta",
    "bowl de yogur y frutas desayuno",
  ],
  lunch: [
    "arroz con pollo colombiano receta",
    "sancocho de gallina receta",
    "ajiaco santafereño receta",
    "bandeja paisa receta",
    "sudado de pollo receta",
    "frijoles antioqueños receta",
    "posta negra cartagenera receta",
    "arroz con coco receta",
    "mote de queso receta",
    "lentejas colombianas receta",
    "pescado frito con patacón receta",
    "carne en bistec receta colombiana",
    "arroz atollado receta",
    "pollo guisado colombiano receta",
    "cazuela de frijoles receta",
    "sobrebarriga en salsa receta",
  ],
  dinner: [
    "cena ligera saludable receta fácil",
    "wrap de pollo receta fácil",
    "crema de ahuyama receta",
    "pasta con pollo y champiñones receta",
    "sándwich cubano receta",
    "ensalada completa con pollo receta",
    "tortilla española receta",
    "pechuga a la plancha receta jugosa",
    "salchipapa casera receta",
    "crema de verduras receta",
    "arepa rellena de carne desmechada receta",
    "pasta boloñesa receta fácil",
    "patacones con hogao receta",
    "quesadillas de pollo receta",
  ],
};

// search.list costs 100 of the 10,000 daily quota units: cache results so reruns don't search again.
const CACHE = new URL("./.cache/seed-candidates.json", import.meta.url);

async function readCache(): Promise<Record<string, string[]>> {
  try {
    return JSON.parse(await readFile(CACHE, "utf8"));
  } catch {
    return {};
  }
}

class QuotaError extends Error {}

function arg(name: string, fallback: number) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

async function search(query: string, max: number): Promise<string[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.search = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: String(max),
    q: query,
    regionCode: "CO",
    relevanceLanguage: "es",
    videoEmbeddable: "true",
    key: process.env.YOUTUBE_API_KEY!,
  }).toString();
  const res = await fetch(url);
  if (res.status === 403 && (await res.clone().text()).includes("quota")) throw new QuotaError("YouTube search quota exhausted");
  if (!res.ok) throw new Error(`YouTube search ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { items: { id: { videoId: string } }[] };
  return body.items.map((i) => i.id.videoId);
}

function argList(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? "").split(",").filter(Boolean) : [];
}

const RECIPE_HINT = /receta|ingrediente|cómo hacer|como hacer|preparar|paso a paso/i;

/** Recipe-looking videos from a channel's uploads playlist, newest first. */
async function channelUploads(channelId: string, max: number): Promise<string[]> {
  const key = process.env.YOUTUBE_API_KEY!;
  const channel = (await (
    await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${key}`)
  ).json()) as { items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[] };
  const uploads = channel.items?.[0]?.contentDetails.relatedPlaylists.uploads;
  if (!uploads) return [];
  const ids: string[] = [];
  let pageToken = "";
  while (ids.length < max) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploads}&key=${key}${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const page = (await (await fetch(url)).json()) as {
      items?: { snippet: { title: string; description: string; resourceId: { videoId: string } } }[];
      nextPageToken?: string;
    };
    for (const item of page.items ?? []) {
      if (RECIPE_HINT.test(`${item.snippet.title}\n${item.snippet.description}`)) ids.push(item.snippet.resourceId.videoId);
    }
    if (!page.nextPageToken) break;
    pageToken = page.nextPageToken;
  }
  return ids.slice(0, max);
}

async function main() {
  const limit = arg("limit", 300);
  const perQuery = arg("per-query", 8);
  const concurrency = arg("concurrency", 4);
  const dryRun = process.argv.includes("--dry-run");

  const channels = argList("channels");
  const meal = process.argv.includes("--meal") ? argList("meal")[0] : undefined;
  if (meal && !(meal in QUERIES)) throw new Error(`Unknown --meal ${meal}`);
  const ids = new Set<string>();
  if (channels.length) {
    for (const channel of channels) {
      const found = await channelUploads(channel, arg("per-channel", 150));
      for (const id of found) ids.add(id);
      console.log(`[channel] ${channel} -> ${found.length} recipe-looking videos`);
    }
    if (!meal) return processCandidates([...ids], { limit, concurrency, dryRun });
  }

  const cache = await readCache();
  const searches = meal ? { [meal]: QUERIES[meal as keyof typeof QUERIES] } : QUERIES;
  searching: for (const [meal, queries] of Object.entries(searches)) {
    for (const q of queries) {
      if (cache[q]) {
        for (const id of cache[q]) ids.add(id);
        continue;
      }
      try {
        cache[q] = await search(q, perQuery);
      } catch (error) {
        if (error instanceof QuotaError) {
          console.log("YouTube search quota exhausted: processing the candidates found so far");
          break searching;
        }
        throw error;
      }
      for (const id of cache[q]) ids.add(id);
      await mkdir(new URL("./.cache/", import.meta.url), { recursive: true });
      await writeFile(CACHE, JSON.stringify(cache, null, 2));
      console.log(`[${meal}] "${q}" -> ${ids.size} candidates`);
    }
  }
  console.log(`${Object.keys(cache).length} queries cached, ${ids.size} candidates`);

  return processCandidates([...ids], { limit, concurrency, dryRun });
}

async function processCandidates(
  candidates: string[],
  { limit, concurrency, dryRun }: { limit: number; concurrency: number; dryRun: boolean },
) {
  const db = createAdminClient();
  const ids = new Set(candidates);
  const { data: existing } = await db.from("recipes").select("source_video_id").eq("source_platform", "youtube");
  const known = new Set((existing ?? []).map((r) => r.source_video_id));
  const todo = [...ids].filter((id) => !known.has(id)).slice(0, limit);
  console.log(`${todo.length} new videos to process${dryRun ? " (dry run)" : ""}`);
  if (dryRun) return;

  const tally: Record<string, number> = {};
  let audioBudget = arg("audio-minutes", 420) * 60;
  let next = 0;

  /** Videos whose description lacks the recipe: transcribe the audio and run the import again. */
  async function withAudio(jobId: string, payload: ImportPayload) {
    const dir = await mkdtemp(join(tmpdir(), "recetra-seed-"));
    try {
      const info = await readInfo(payload.url);
      const seconds = info.duration ?? MAX_AUDIO_SECONDS;
      if (seconds > Math.min(MAX_AUDIO_SECONDS, 15 * 60) || seconds > audioBudget) return null;
      audioBudget -= seconds;
      let transcript: string;
      try {
        transcript = await transcribeAudio(await downloadAudio(payload.url, dir));
      } catch (error) {
        audioBudget += seconds;
        throw error;
      }
      const worker = { metadata: toMetadata(payload.url, info), transcript };
      await db
        .from("jobs")
        .update({ payload: { ...payload, worker } as unknown as Json, result: null })
        .eq("id", jobId);
      return processImportJob(jobId);
    } catch (error) {
      console.error(`audio failed for ${payload.url}:`, error instanceof Error ? error.message : error);
      return null;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  async function workerLoop() {
    while (next < todo.length) {
      const id = todo[next++]!;
      const payload: ImportPayload = { url: `https://www.youtube.com/watch?v=${id}`, visibility: "public", seed: true };
      const { data: job, error } = await db.from("jobs").insert({ kind: "import_recipe", payload }).select("id").single();
      if (error || !job) throw new Error(`Could not create job: ${error?.message}`);
      let result = await processImportJob(job.id);
      if (result?.stage === "needs_worker") result = (await withAudio(job.id, payload)) ?? { stage: "failed", reason: "low_confidence" };
      const key = result ? (result.stage === "failed" ? `failed:${result.reason}` : result.stage) : "error";
      tally[key] = (tally[key] ?? 0) + 1;
      // Seed jobs are bookkeeping only; drop them once processed.
      await db.from("jobs").delete().eq("id", job.id);
      console.log(`${next}/${todo.length} ${id} -> ${key}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, workerLoop));
  console.log("summary", tally, `audio left: ${Math.round(audioBudget / 60)} min`);
}

await main();
