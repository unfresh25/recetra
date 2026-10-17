/**
 * GitHub Actions worker for imports the web app can't finish on its own:
 * Instagram posts (no public oEmbed) and videos whose caption lacks the ingredients.
 * It reads metadata and audio with yt-dlp, transcribes with Groq Whisper, and reruns the import.
 *
 * Run with: bun --conditions=react-server jobs/import-worker.ts
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdminClient } from "../lib/supabase/admin";
import type { Json } from "../lib/supabase/database.types";
import { processImportJob, type ImportPayload, type ImportResult } from "../lib/recipes/import";
import { MAX_AUDIO_SECONDS, downloadAudio, readInfo, toMetadata } from "../lib/recipes/media";
import { transcribeAudio } from "../lib/recipes/transcribe";

async function main() {
  const db = createAdminClient();
  const { data: jobs, error } = await db
    .from("jobs")
    .select("id, payload, result")
    .eq("kind", "import_recipe")
    .eq("status", "queued")
    .lte("run_after", new Date().toISOString())
    .order("created_at")
    .limit(15);
  if (error) throw error;

  const pending = (jobs ?? []).filter((j) => (j.result as ImportResult | null)?.stage === "needs_worker");
  console.log(`worker: ${pending.length} job(s) need yt-dlp`);

  for (const job of pending) {
    const payload = job.payload as unknown as ImportPayload;
    const dir = await mkdtemp(join(tmpdir(), "recetra-"));
    try {
      const info = await readInfo(payload.url);
      const metadata = toMetadata(payload.url, info);
      let transcript: string | undefined;
      if (!info.duration || info.duration <= MAX_AUDIO_SECONDS) {
        transcript = await transcribeAudio(await downloadAudio(payload.url, dir));
      }
      const worker = { metadata, transcript };
      await db
        .from("jobs")
        .update({ payload: { ...payload, worker } as unknown as Json, result: null, run_after: new Date().toISOString() })
        .eq("id", job.id);
      const result = await processImportJob(job.id);
      console.log(`job ${job.id}: ${result?.stage ?? "error"}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`job ${job.id} failed:`, message);
      await db
        .from("jobs")
        .update({ status: "failed", last_error: message.slice(0, 500), result: { stage: "failed", reason: "not_found" } })
        .eq("id", job.id);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

await main();
