"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { Enums } from "@/lib/supabase/database.types";

type YTPlayer = {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  unMute(): void;
  isMuted(): boolean;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: { videoId: string; playerVars: Record<string, number | string>; events: Record<string, (e: { target: YTPlayer }) => void> },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi() {
  apiPromise ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!);
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}

/**
 * The creator's video for cook mode. Created once and never reloaded: on YouTube each step
 * seeks to its second; other platforms keep playing where they are.
 */
export function StepVideo({
  platform,
  videoId,
  startSeconds,
  title,
}: {
  platform: Enums<"source_platform">;
  videoId: string;
  startSeconds: number | null;
  title: string;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [muted, setMuted] = useState(false);
  const firstStart = useRef(startSeconds ?? 0);

  useEffect(() => {
    if (platform !== "youtube" || !mount.current) return;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !mount.current) return;
      player.current = new YT.Player(mount.current, {
        videoId,
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, start: firstStart.current },
        events: {
          onReady: ({ target }) => {
            target.unMute();
            target.playVideo();
            // Browsers may still force mute when autoplay lacks a recent tap.
            setTimeout(() => setMuted(target.isMuted()), 600);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, [platform, videoId]);

  useEffect(() => {
    if (platform === "youtube" && startSeconds !== null) player.current?.seekTo(startSeconds, true);
  }, [platform, startSeconds]);

  if (platform === "youtube") {
    return (
      <>
        <div ref={mount} className="absolute inset-0 size-full [&>iframe]:size-full" />
        {muted ? (
          <button
            type="button"
            onClick={() => {
              player.current?.unMute();
              player.current?.playVideo();
              setMuted(false);
            }}
            className="absolute bottom-3 right-3 flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink"
          >
            <Icon name="play" size={16} /> Activar sonido
          </button>
        ) : null}
      </>
    );
  }

  const src =
    platform === "tiktok"
      ? `https://www.tiktok.com/player/v1/${videoId}?autoplay=1&rel=0`
      : platform === "instagram"
        ? `https://www.instagram.com/reel/${videoId}/embed`
        : null;
  if (!src) return null;
  return (
    <iframe
      src={src}
      title={`Video: ${title}`}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      className="absolute inset-0 size-full"
    />
  );
}
