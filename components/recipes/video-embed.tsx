"use client";

import Image from "next/image";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { Enums } from "@/lib/supabase/database.types";

function embedUrl(platform: Enums<"source_platform">, videoId: string, start?: number | null) {
  switch (platform) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1${start ? `&start=${start}` : ""}`;
    case "tiktok":
      return `https://www.tiktok.com/player/v1/${videoId}?autoplay=1&rel=0`;
    case "instagram":
      return `https://www.instagram.com/reel/${videoId}/embed`;
    default:
      return null;
  }
}

/** Shows the cover; the creator's video only loads when tapped (saves data). */
export function VideoEmbed({
  platform,
  videoId,
  coverUrl,
  title,
}: {
  platform: Enums<"source_platform">;
  videoId: string | null;
  coverUrl: string | null;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  const src = videoId ? embedUrl(platform, videoId) : null;

  if (playing && src) {
    return (
      <iframe
        src={src}
        title={`Video: ${title}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 size-full bg-black"
      />
    );
  }

  return (
    <>
      {coverUrl ? (
        <Image src={coverUrl} alt={title} fill preload sizes="448px" className="object-cover" unoptimized />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-sunken text-7xl">🍲</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/40" />
      {src ? (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Ver video"
          className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand shadow-float backdrop-blur transition-transform active:scale-95"
        >
          <Icon name="play" size={28} strokeWidth={2.2} />
        </button>
      ) : null}
    </>
  );
}
