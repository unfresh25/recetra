import "server-only";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";

type Segment = { start: number; text: string };

const MAX_RATE_LIMIT_RETRIES = 8;

/** Reads "try again in 1m2.5s" / "in 37s" from Groq, or the Retry-After header. Adds a small margin. */
export function retryAfterMs(header: string | null, body: string): number {
  const match = body.match(/try again in (?:(\d+)m)?([\d.]+)s/);
  if (match) return (Number(match[1] ?? 0) * 60 + Number(match[2])) * 1000 + 1000;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 + 1000 : 30_000;
}

function stamp(seconds: number) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatSegments(text: string, segments: Segment[] | undefined) {
  if (!segments?.length) return text;
  return segments.map((s) => `[${stamp(s.start)}] ${s.text.trim()}`).join("\n");
}

/**
 * Transcribes an audio file; each line is prefixed with its [m:ss] start time.
 * Groq Whisper by default. TRANSCRIBE_BACKEND=local uses mlx-whisper on an Apple Silicon Mac,
 * which has no hourly limit and is meant for bulk catalog seeding.
 */
export async function transcribeAudio(filePath: string): Promise<string> {
  return process.env.TRANSCRIBE_BACKEND === "local" ? transcribeLocally(filePath) : transcribeWithGroq(filePath);
}

const run = promisify(execFile);
let localQueue: Promise<unknown> = Promise.resolve();

/** One local transcription at a time: they all compete for the same GPU. */
function transcribeLocally(filePath: string): Promise<string> {
  const job = localQueue.then(async () => {
    const outDir = await mkdtemp(join(tmpdir(), "recetra-whisper-"));
    try {
      await run(
        process.env.MLX_WHISPER_BIN ?? "mlx_whisper",
        [filePath, "--model", "mlx-community/whisper-large-v3-turbo", "--language", "es", "--output-format", "json", "--output-dir", outDir, "--verbose", "False"],
        { timeout: 15 * 60_000, maxBuffer: 16 * 1024 * 1024 },
      );
      const name = basename(filePath).replace(/\.[^.]+$/, "");
      const body = JSON.parse(await readFile(join(outDir, `${name}.json`), "utf8")) as { text: string; segments?: Segment[] };
      return formatSegments(body.text, body.segments);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
  localQueue = job.catch(() => undefined);
  return job;
}

async function transcribeWithGroq(filePath: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Missing environment variable GROQ_API_KEY");

  const form = new FormData();
  form.set("file", new Blob([await readFile(filePath)]), basename(filePath));
  form.set("model", "whisper-large-v3-turbo");
  form.set("language", "es");
  form.set("response_format", "verbose_json");

  let res: Response;
  for (let attempt = 0; ; attempt++) {
    res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    // The free plan allows 7,200 s of audio per hour: wait what Groq asks and try again.
    if (res.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) break;
    const waitMs = retryAfterMs(res.headers.get("retry-after"), await res.text());
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  if (!res.ok) throw new Error(`Groq transcription failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { text: string; segments?: Segment[] };
  return formatSegments(body.text, body.segments);
}
