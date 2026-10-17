import "server-only";
import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { VideoMetadata } from "./metadata";
import { parseRecipeUrl } from "./source";

/** yt-dlp helpers shared by the import worker and the catalog seed. */
const run = promisify(execFile);
const YT_DLP = process.env.YT_DLP_BIN ?? "yt-dlp";
export const MAX_AUDIO_SECONDS = 20 * 60;

export type YtDlpInfo = {
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

export async function readInfo(url: string): Promise<YtDlpInfo> {
  const { stdout } = await run(YT_DLP, ["--dump-json", "--no-warnings", "--no-playlist", url], {
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120_000,
  });
  return JSON.parse(stdout) as YtDlpInfo;
}

export async function downloadAudio(url: string, dir: string): Promise<string> {
  await run(
    YT_DLP,
    ["-q", "--no-warnings", "--no-playlist", "-f", "bestaudio[filesize<24M]/bestaudio/best[filesize<24M]", "-o", join(dir, "audio.%(ext)s"), url],
    { timeout: 300_000 },
  );
  const file = (await readdir(dir)).find((f) => f.startsWith("audio."));
  if (!file) throw new Error("yt-dlp produced no audio file");
  return join(dir, file);
}

export function toMetadata(payloadUrl: string, info: YtDlpInfo): VideoMetadata {
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

