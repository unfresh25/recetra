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
 * Mounted on demand in the video drawer. YouTube starts at the current step's timestamp.
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
  // The player object exists before its methods do; only call them once onReady fired.
  const ready = useRef(false);
  const pendingSeek = useRef<number | null>(null);
  const [muted, setMuted] = useState(false);
  const firstStart = useRef(startSeconds ?? 0);

  useEffect(() => {
    if (platform !== "youtube" || !mount.current) return;
    let cancelled = false;
    let muteCheck: ReturnType<typeof setTimeout> | undefined;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !mount.current) return;
      const target = document.createElement("div");
      mount.current.replaceChildren(target);
      player.current = new YT.Player(target, {
        videoId,
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, start: firstStart.current },
        events: {
          onReady: ({ target }) => {
            if (cancelled) return;
            ready.current = true;
            if (pendingSeek.current !== null) target.seekTo(pendingSeek.current, true);
            target.unMute();
            target.playVideo();
            // Browsers may still force mute when autoplay lacks a recent tap.
            muteCheck = setTimeout(() => { if (!cancelled) setMuted(target.isMuted()); }, 600);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      clearTimeout(muteCheck);
      player.current?.destroy?.();
      player.current = null;
      ready.current = false;
    };
  }, [platform, videoId]);

  useEffect(() => {
    if (platform !== "youtube" || startSeconds === null) return;
    if (ready.current && player.current) player.current.seekTo(startSeconds, true);
    else pendingSeek.current = startSeconds;
  }, [platform, startSeconds]);

  if (platform === "youtube") {
    return (
      <>
        <div ref={mount} className="absolute inset-0 size-full [&>iframe]:size-full" />
        {muted ? (
          <button
            type="button"
            onClick={() => {
              if (!ready.current) return;
              player.current?.unMute();
              player.current?.playVideo();
              setMuted(false);
            }}
            className="btn-float absolute bottom-3 right-3 flex h-10 items-center gap-2 rounded-full bg-canvas px-4 font-display text-sm text-ink"
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
