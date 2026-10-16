/**
 * GitHub Actions worker for imports the web app can't finish on its own:
 * Instagram posts (no public oEmbed) and videos whose caption lacks the ingredients.
 * It reads metadata and audio with yt-dlp, transcribes with Groq Whisper, and reruns the import.
 *
 * Run with: bun --conditions=react-server jobs/import-worker.ts
 */
import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createAdminClient } from "../lib/supabase/admin";
import type { Json } from "../lib/supabase/database.types";
import { processImportJob, type ImportPayload, type ImportResult } from "../lib/recipes/import";
import type { VideoMetadata } from "../lib/recipes/metadata";
import { parseRecipeUrl } from "../lib/recipes/source";
import { transcribeAudio } from "../lib/recipes/transcribe";

const run = promisify(execFile);
const YT_DLP = process.env.YT_DLP_BIN ?? "yt-dlp";
const MAX_AUDIO_SECONDS = 20 * 60;

type YtDlpInfo = {
  id: string;
  title?: string;
  description?: string;
  uploader?: string;
  uploader_id?: string;
  channel?: string;
  uploader_url?: string;
  channel_url?: string;
  thumbnail?: string;
  duration?: number;
  webpage_url?: string;
};

async function readInfo(url: string): Promise<YtDlpInfo> {
  const { stdout } = await run(YT_DLP, ["--dump-json", "--no-warnings", "--no-playlist", url], {
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120_000,
  });
  return JSON.parse(stdout) as YtDlpInfo;
}

async function downloadAudio(url: string, dir: string): Promise<string> {
  await run(
    YT_DLP,
    ["-q", "--no-warnings", "--no-playlist", "-f", "bestaudio[filesize<24M]/bestaudio/best[filesize<24M]", "-o", join(dir, "audio.%(ext)s"), url],
    { timeout: 300_000 },
  );
  const file = (await readdir(dir)).find((f) => f.startsWith("audio."));
  if (!file) throw new Error("yt-dlp produced no audio file");
  return join(dir, file);
}

function toMetadata(payloadUrl: string, info: YtDlpInfo): VideoMetadata {
  const source = parseRecipeUrl(payloadUrl);
  if (!source) throw new Error(`Unsupported URL ${payloadUrl}`);
  const handle = info.uploader_id ? (info.uploader_id.startsWith("@") ? info.uploader_id : `@${info.uploader_id}`) : null;
  const text = info.description ?? "";
  return {
    platform: source.platform,
    videoId: source.videoId ?? info.id,
    url: source.videoId ? source.url : (info.webpage_url ?? payloadUrl),
    title: (info.title && info.title !== "Video by " + info.uploader ? info.title : text.split("\n")[0] ?? "").slice(0, 160),
    text,
    authorName: info.uploader ?? info.channel ?? null,
    authorHandle: handle,
    authorUrl: info.uploader_url ?? info.channel_url ?? null,
    thumbnailUrl: info.thumbnail ?? null,
    durationSeconds: info.duration ? Math.round(info.duration) : null,
  };
}

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
