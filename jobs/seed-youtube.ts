/**
 * Seeds the public catalog with Colombian recipes from YouTube.
 * Only confident recipes whose description lists the ingredients are kept (auto-approved).
 *
 * Run with: bun --conditions=react-server jobs/seed-youtube.ts [--limit 300] [--per-query 8] [--dry-run]
 */
import { createAdminClient } from "../lib/supabase/admin";
import { processImportJob, type ImportPayload } from "../lib/recipes/import";

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
  if (!res.ok) throw new Error(`YouTube search ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { items: { id: { videoId: string } }[] };
  return body.items.map((i) => i.id.videoId);
}

async function main() {
  const limit = arg("limit", 300);
  const perQuery = arg("per-query", 8);
  const concurrency = arg("concurrency", 4);
  const dryRun = process.argv.includes("--dry-run");
  const db = createAdminClient();

  const ids = new Set<string>();
  for (const [meal, queries] of Object.entries(QUERIES)) {
    for (const q of queries) {
      for (const id of await search(q, perQuery)) ids.add(id);
      console.log(`[${meal}] "${q}" -> ${ids.size} candidates`);
    }
  }

  const { data: existing } = await db.from("recipes").select("source_video_id").eq("source_platform", "youtube");
  const known = new Set((existing ?? []).map((r) => r.source_video_id));
  const todo = [...ids].filter((id) => !known.has(id)).slice(0, limit);
  console.log(`${todo.length} new videos to process${dryRun ? " (dry run)" : ""}`);
  if (dryRun) return;

  const tally: Record<string, number> = {};
  let next = 0;
  async function workerLoop() {
    while (next < todo.length) {
      const id = todo[next++]!;
      const payload: ImportPayload = { url: `https://www.youtube.com/watch?v=${id}`, visibility: "public", seed: true };
      const { data: job } = await db.from("jobs").insert({ kind: "import_recipe", payload }).select("id").single();
      const result = await processImportJob(job!.id);
      const key = result ? (result.stage === "failed" ? `failed:${result.reason}` : result.stage) : "error";
      tally[key] = (tally[key] ?? 0) + 1;
      // Seed jobs are bookkeeping only; drop them once processed.
      await db.from("jobs").delete().eq("id", job!.id);
      console.log(`${next}/${todo.length} ${id} -> ${key}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, workerLoop));
  console.log("summary", tally);
}

await main();
