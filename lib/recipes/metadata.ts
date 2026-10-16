import "server-only";
import { parseRecipeUrl, type RecipeSource } from "./source";

/** Everything we can learn about a video without downloading it. */
export type VideoMetadata = {
  platform: RecipeSource["platform"];
  videoId: string;
  url: string;
  title: string;
  /** Caption or description: where most creators list ingredients. */
  text: string;
  authorName: string | null;
  authorHandle: string | null;
  authorUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
};

export class MetadataError extends Error {
  constructor(
    message: string,
    readonly reason: "unsupported" | "not_found" | "needs_worker" | "upstream",
  ) {
    super(message);
  }
}

const UA = "Mozilla/5.0 (compatible; RecetraBot/0.1; +https://recetra.vercel.app)";

export async function fetchVideoMetadata(source: RecipeSource): Promise<VideoMetadata> {
  switch (source.platform) {
    case "youtube":
      return fetchYouTube(source.videoId!);
    case "tiktok":
      return fetchTikTok(source);
    case "instagram":
      // Instagram has no public oEmbed; the GitHub Actions worker reads it with yt-dlp.
      throw new MetadataError("Instagram requires the worker", "needs_worker");
  }
}

function parseIsoDuration(value: string | undefined): number | null {
  const m = value?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

async function fetchYouTube(videoId: string): Promise<VideoMetadata> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new MetadataError("YOUTUBE_API_KEY is not set", "upstream");
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.search = new URLSearchParams({ id: videoId, part: "snippet,contentDetails", key }).toString();
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new MetadataError(`YouTube API ${res.status}`, "upstream");
  const body = (await res.json()) as {
    items?: {
      snippet: {
        title: string;
        description: string;
        channelTitle: string;
        channelId: string;
        thumbnails: Record<string, { url: string; width: number }>;
      };
      contentDetails: { duration: string };
    }[];
  };
  const item = body.items?.[0];
  if (!item) throw new MetadataError("Video not found", "not_found");
  const thumbs = Object.values(item.snippet.thumbnails).sort((a, b) => b.width - a.width);
  return {
    platform: "youtube",
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: item.snippet.title,
    text: item.snippet.description,
    authorName: item.snippet.channelTitle,
    authorHandle: null,
    authorUrl: `https://www.youtube.com/channel/${item.snippet.channelId}`,
    thumbnailUrl: thumbs[0]?.url ?? null,
    durationSeconds: parseIsoDuration(item.contentDetails.duration),
  };
}

async function fetchTikTok(source: RecipeSource): Promise<VideoMetadata> {
  let resolved = source;
  if (!source.videoId) {
    // Short link: follow the redirect to the canonical URL.
    const res = await fetch(source.url, { redirect: "follow", headers: { "User-Agent": UA }, cache: "no-store" });
    const parsed = parseRecipeUrl(res.url);
    if (!parsed?.videoId || parsed.platform !== "tiktok") throw new MetadataError("Could not resolve TikTok link", "not_found");
    resolved = parsed;
  }
  const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(resolved.url)}`, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (res.status === 400 || res.status === 404) throw new MetadataError("TikTok video not found", "not_found");
  if (!res.ok) throw new MetadataError(`TikTok oEmbed ${res.status}`, "upstream");
  const body = (await res.json()) as {
    title?: string;
    author_name?: string;
    author_unique_id?: string;
    author_url?: string;
    thumbnail_url?: string;
  };
  const caption = body.title ?? "";
  return {
    platform: "tiktok",
    videoId: resolved.videoId!,
    url: resolved.url,
    title: caption.split("\n")[0]!.slice(0, 160),
    text: caption,
    authorName: body.author_name ?? null,
    authorHandle: body.author_unique_id ? `@${body.author_unique_id}` : null,
    authorUrl: body.author_url ?? null,
    thumbnailUrl: body.thumbnail_url ?? null,
    durationSeconds: null,
  };
}
