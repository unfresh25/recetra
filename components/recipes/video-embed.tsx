"use client";

import Image from "next/image";
import { createContext, use, useRef, useState, type ReactNode, type RefObject } from "react";
import { Icon } from "@/components/ui/icon";
import { tiktokPlayerUrl } from "@/lib/recipes/cook-video";
import type { Enums } from "@/lib/supabase/database.types";

function embedUrl(platform: Enums<"source_platform">, videoId: string, start: number) {
  switch (platform) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&playsinline=1&start=${start}`;
    case "tiktok":
      return tiktokPlayerUrl(videoId, { autoplay: true, loop: false, fullscreen: true, timestamp: true });
    case "instagram":
      return `https://www.instagram.com/reel/${videoId}/embed`;
    default:
      return null;
  }
}

const VideoContext = createContext<{
  playback: { seconds: number; request: number } | null;
  hero: RefObject<HTMLDivElement | null>;
  play: (seconds?: number) => void;
} | null>(null);

export function RecipeVideoProvider({ children }: { children: ReactNode }) {
  const [playback, setPlayback] = useState<{ seconds: number; request: number } | null>(null);
  const hero = useRef<HTMLDivElement>(null);
  function play(seconds = 0) {
    setPlayback((previous) => ({ seconds, request: (previous?.request ?? 0) + 1 }));
    hero.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  return <VideoContext value={{ playback, hero, play }}>{children}</VideoContext>;
}

function useRecipeVideo() {
  const context = use(VideoContext);
  if (!context) throw new Error("RecipeVideoProvider missing");
  return context;
}

/** The hero, steps heading and timestamps all start this same video. */
export function VideoPlayButton({ dark = false, seconds }: { dark?: boolean; seconds?: number }) {
  const { play } = useRecipeVideo();
  return (
    <button type="button" onClick={() => play(seconds)} className={`inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3 font-display text-xs ${dark ? "btn-ink bg-ink text-canvas" : "btn-outline border border-line text-ink"}`}>
      <Icon name="play" size={14} /> {seconds === undefined ? "Ver video" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
    </button>
  );
}

/** Keep the cover until a play control is pressed; do not load a third-party player early. */
export function VideoEmbed({ platform, videoId, coverUrl, title }: {
  platform: Enums<"source_platform">;
  videoId: string | null;
  coverUrl: string | null;
  title: string;
}) {
  const { playback, hero, play } = useRecipeVideo();
  const src = videoId ? embedUrl(platform, videoId, playback?.seconds ?? 0) : null;
  return (
    <div ref={hero} className="absolute inset-0">
      {playback && src ? <iframe
        key={playback.request}
        src={src}
        title={`Video: ${title}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 size-full bg-ink"
      /> : <>
        {coverUrl ? <Image src={coverUrl} alt={title} fill preload sizes="(max-width: 576px) 100vw, 576px" className="object-cover" unoptimized /> : <div className="absolute inset-0 flex items-center justify-center bg-canvas text-ink-faint"><Icon name="pot" size={72} strokeWidth={1.2} /></div>}
        {src ? <button type="button" onClick={() => play()} aria-label="Reproducir video" className="btn-ghost absolute inset-0 flex items-center justify-center text-ink">
          <span className="flex size-14 items-center justify-center rounded-full bg-canvas/90"><Icon name="play" size={24} /></span>
        </button> : null}
      </>}
    </div>
  );
}
