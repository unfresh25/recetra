import "server-only";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

type Segment = { start: number; text: string };

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

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Groq transcription failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { text: string; segments?: Segment[] };
  if (!body.segments?.length) return body.text;
  return body.segments.map((s) => `[${stamp(s.start)}] ${s.text.trim()}`).join("\n");
}
