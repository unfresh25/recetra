import type { Enums } from "@/lib/supabase/database.types";

export type SourcePlatform = Exclude<Enums<"source_platform">, "manual">;

export type RecipeSource = {
  platform: SourcePlatform;
  /** Stable id used to dedupe imports. Null for TikTok short links until resolved. */
  videoId: string | null;
  url: string;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Recognizes TikTok, Instagram and YouTube links. Returns null for anything else. */
export function parseRecipeUrl(input: string): RecipeSource | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "music.youtube.com") {
    const id = parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed" ? parts[1] : url.searchParams.get("v");
    return id && YOUTUBE_ID.test(id) ? youtube(id) : null;
  }
  if (host === "youtu.be") {
    return parts[0] && YOUTUBE_ID.test(parts[0]) ? youtube(parts[0]) : null;
  }

  if (host === "tiktok.com") {
    const index = parts.indexOf("video");
    const id = index >= 0 ? parts[index + 1] : null;
    if (id && /^\d{8,25}$/.test(id) && parts[0]?.startsWith("@")) {
      return { platform: "tiktok", videoId: id, url: `https://www.tiktok.com/${parts[0]}/video/${id}` };
    }
    return null;
  }
  if (host === "vm.tiktok.com" || host === "vt.tiktok.com") {
    // Short links must be resolved with a request before we know the video id.
    return parts[0] ? { platform: "tiktok", videoId: null, url: `https://${host}/${parts[0]}/` } : null;
  }

  if (host === "instagram.com") {
    const kind = parts[0];
    const code = parts[1];
    if ((kind === "reel" || kind === "reels" || kind === "p" || kind === "tv") && code && /^[A-Za-z0-9_-]{5,40}$/.test(code)) {
      return { platform: "instagram", videoId: code, url: `https://www.instagram.com/reel/${code}/` };
    }
    return null;
  }

  return null;
}

function youtube(id: string): RecipeSource {
  return { platform: "youtube", videoId: id, url: `https://www.youtube.com/watch?v=${id}` };
}
