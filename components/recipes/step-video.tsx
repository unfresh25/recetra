"use client";

import { useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { Enums } from "@/lib/supabase/database.types";

type YTPlayer = {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
};
type YTNamespace = {
  Player: new (el: HTMLElement, opts: {
    videoId: string;
    playerVars: Record<string, number | string>;
    events: { onReady: (event: { target: YTPlayer }) => void; onStateChange: (event: { data: number }) => void; onAutoplayBlocked: () => void; onError: () => void };
  }) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => { apiPromise = null; reject(new Error("YouTube API unavailable")); };
    document.head.appendChild(script);
  });
  return apiPromise;
}

export type StepVideoHandle = {
  seek: (seconds: number) => void;
  /** Called synchronously from the expand tap to retain the audio user gesture. */
  activate: (sound: boolean) => void;
  togglePlayback: () => boolean | undefined;
};

/** One player for the whole cook session. Only its parent's fixed geometry changes. */
export function StepVideo({ platform, videoId, startSeconds, segmentStart, segmentEnd, title, expanded, hidden, onError, onTime, onPlayingChange, ref }: {
  platform: Enums<"source_platform">;
  videoId: string;
  startSeconds: number | null;
  segmentStart: number | null;
  segmentEnd: number | null;
  title: string;
  expanded: boolean;
  hidden: boolean;
  onError: () => void;
  onTime: (seconds: number) => void;
  onPlayingChange: (playing: boolean) => void;
  ref: Ref<StepVideoHandle>;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const ready = useRef(false);
  const playing = useRef(false);
  const firstStart = useRef(startSeconds ?? 0);
  const pendingSeek = useRef<number | null>(startSeconds ?? 0);
  const [failed, setFailed] = useState(false);
  const reportFailure = useEffectEvent(() => {
    setFailed(true);
    onError();
  });

  function tiktok(type: string, value?: number) {
    iframe.current?.contentWindow?.postMessage({ type, value, "x-tiktok-player": true }, "https://www.tiktok.com");
  }
  function seek(seconds: number) {
    pendingSeek.current = seconds;
    if (!ready.current) return;
    if (platform === "youtube") {
      player.current?.seekTo(seconds, true);
      pendingSeek.current = null;
    } else if (platform === "tiktok" && playing.current) {
      tiktok("seekTo", seconds);
      pendingSeek.current = null;
    }
  }
  function activate(sound: boolean) {
    if (!ready.current) return;
    if (platform === "youtube") {
      if (sound) player.current?.unMute();
      else player.current?.mute();
      player.current?.playVideo();
    } else if (platform === "tiktok") {
      tiktok(sound ? "unMute" : "mute");
      tiktok("play");
    }
  }
  function togglePlayback() {
    if (!ready.current || (platform !== "youtube" && platform !== "tiktok")) return;
    const next = !playing.current;
    // Track intent synchronously so rapid taps still alternate before the API replies.
    playing.current = next;
    onPlayingChange(next);
    if (platform === "youtube") {
      if (next) { player.current?.unMute(); player.current?.playVideo(); }
      else player.current?.pauseVideo();
    } else {
      if (next) tiktok("unMute");
      tiktok(next ? "play" : "pause");
    }
    return next;
  }
  useImperativeHandle(ref, () => ({ seek, activate, togglePlayback }));

  const reportPlayback = useEffectEvent((state: number) => {
    playing.current = state === 1 || state === 3;
    onPlayingChange(playing.current);
  });

  function syncPlayer() {
    if (!ready.current) return;
    if (hidden) {
      player.current?.mute();
      player.current?.pauseVideo();
      tiktok("mute");
      tiktok("pause");
    } else activate(expanded);
  }
  const syncPlayback = useEffectEvent(syncPlayer);
  useEffect(() => { syncPlayback(); }, [expanded, hidden]);

  const reportTime = useEffectEvent((seconds: number) => {
    if (hidden || !Number.isFinite(seconds)) return;
    if (expanded) onTime(seconds);
    else if (segmentStart !== null && segmentEnd !== null && seconds >= segmentEnd) seek(segmentStart);
  });
  const initialize = useEffectEvent((target: YTPlayer) => {
    ready.current = true;
    target.getIframe().title = `Video: ${title}`;
    target.getIframe().tabIndex = -1;
    if (pendingSeek.current !== null) seek(pendingSeek.current);
    syncPlayback();
  });

  useEffect(() => {
    if (platform !== "youtube") return;
    let cancelled = false;
    const host = mount.current;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !host) return;
      const target = document.createElement("div");
      host.replaceChildren(target);
      player.current = new YT.Player(target, {
        videoId,
        playerVars: { autoplay: 1, mute: 1, controls: 0, rel: 0, iv_load_policy: 3, cc_load_policy: 0, hl: "es", playsinline: 1, disablekb: 1, fs: 0, modestbranding: 1, enablejsapi: 1, origin: window.location.origin, start: firstStart.current },
        events: {
          onReady: ({ target }) => { if (!cancelled) initialize(target); },
          onStateChange: ({ data }) => { if (!cancelled) reportPlayback(data); },
          onAutoplayBlocked: () => { if (!cancelled) reportPlayback(2); },
          onError: () => { if (!cancelled) reportFailure(); },
        },
      });
    }).catch(() => { if (!cancelled) reportFailure(); });
    return () => {
      cancelled = true;
      if (ready.current && player.current) pendingSeek.current = player.current.getCurrentTime();
      player.current?.destroy();
      player.current = null;
      ready.current = false;
      playing.current = false;
    };
  }, [platform, videoId]);

  useEffect(() => {
    if (platform !== "youtube" || hidden) return;
    const interval = setInterval(() => {
      if (ready.current && player.current?.getPlayerState() === 1) reportTime(player.current.getCurrentTime());
    }, 500);
    return () => clearInterval(interval);
  }, [platform, hidden]);

  useEffect(() => {
    if (platform !== "tiktok") return;
    function onMessage(event: MessageEvent) {
      if (event.source !== iframe.current?.contentWindow || event.origin !== "https://www.tiktok.com") return;
      const data = event.data;
      if (!data || data["x-tiktok-player"] !== true) return;
      if (data.type === "onPlayerReady") {
        ready.current = true;
        syncPlayback();
      } else if (data.type === "onStateChange") {
        reportPlayback(data.value);
        // TikTok can drop seeks before playback has started. Flush the latest request once playing.
        if (data.value === 1 && pendingSeek.current !== null) {
          tiktok("seekTo", pendingSeek.current);
          pendingSeek.current = null;
        }
      } else if (data.type === "onCurrentTime" && playing.current && typeof data.value?.currentTime === "number") {
        reportTime(data.value.currentTime);
      } else if (data.type === "onPlayerError") {
        if (data.value?.errorCode === 3002) reportPlayback(2);
        else reportFailure();
      }
    }
    window.addEventListener("message", onMessage);
    // Ready may precede hydration, or Activity may have preserved an already loaded iframe.
    // Early commands are harmless; onPlayerReady/onLoad repeat the handshake if still loading.
    ready.current = true;
    syncPlayback();
    return () => {
      window.removeEventListener("message", onMessage);
      tiktok("pause");
      playing.current = false;
    };
  }, [platform]);

  const src = platform === "tiktok"
    // muted=1 locks out unMute in TikTok; mute via the ready handshake before starting instead.
    ? `https://www.tiktok.com/player/v1/${videoId}?autoplay=0&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0&music_info=0&description=0&loop=1&rel=0`
    : platform === "instagram" ? `https://www.instagram.com/reel/${videoId}/embed` : null;
  return <>
    <div className={`cook-player-stage ${platform === "youtube" ? "cook-player-landscape" : "cook-player-portrait"}`}>
      {platform === "youtube" ? <div ref={mount} className="size-full [&>iframe]:pointer-events-none [&>iframe]:size-full" /> : src ? <iframe ref={iframe} src={src} title={`Video: ${title}`} tabIndex={-1} onLoad={() => {
        // Also handshake on load in case a fast embed emitted ready before hydration.
        ready.current = true;
        syncPlayer();
      }} onError={() => { setFailed(true); onError(); }} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className={`size-full border-0${platform === "tiktok" ? " pointer-events-none" : ""}`} /> : null}
    </div>
    {failed ? <p role="status" className="absolute inset-0 flex items-center justify-center bg-black p-3 text-center text-xs text-white">No pudimos cargar el video.</p> : null}
  </>;
}
