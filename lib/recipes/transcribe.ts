import "server-only";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

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

/** Transcribes an audio file with Groq Whisper; each line is prefixed with its [m:ss] start time. */
export async function transcribeAudio(filePath: string): Promise<string> {
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
  if (!body.segments?.length) return body.text;
  return body.segments.map((s) => `[${stamp(s.start)}] ${s.text.trim()}`).join("\n");
}
