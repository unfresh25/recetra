"use client";

import { useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type Ref } from "react";
import { CookPlayerController, tiktokPlayerUrl } from "@/lib/recipes/cook-video";
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
  togglePlayback: () => void;
};

type StepVideoProps = {
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
  onNativeControlsChange: (nativeControls: boolean) => void;
  ref: Ref<StepVideoHandle>;
};

/** One player for the whole cook session. Only its parent's fixed geometry changes. */
export function StepVideo(props: StepVideoProps) {
  return props.platform === "tiktok" ? <TikTokStepVideo {...props} /> : <ControlledStepVideo {...props} />;
}

function TikTokStepVideo({ videoId, title, onError, ref }: StepVideoProps) {
  // TikTok exposes no working command/event transport. Navigation only changes our step text.
  useImperativeHandle(ref, () => ({ seek() {}, activate() {}, togglePlayback() {} }), []);

  return <div className="cook-player-stage cook-player-portrait">
    <iframe src={tiktokPlayerUrl(videoId)} title={`Video: ${title}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen onError={onError} className="pointer-events-auto size-full border-0" />
  </div>;
}

function ControlledStepVideo({ platform, videoId, startSeconds, segmentStart, segmentEnd, title, expanded, hidden, onError, onTime, onPlayingChange, onNativeControlsChange, ref }: StepVideoProps) {
  const mount = useRef<HTMLDivElement>(null);
  const controller = useRef<CookPlayerController | null>(null);
  const nativeMode = useRef(false);
  const firstStart = useRef(startSeconds ?? 0);
  const [failed, setFailed] = useState(false);
  const [nativeControls, setNativeControls] = useState(false);
  const reportFailure = useEffectEvent(() => {
    setFailed(true);
    onError();
  });

  function seek(seconds: number) {
    firstStart.current = seconds;
    controller.current?.command({ type: "seekTo", value: seconds });
  }
  function activate(sound: boolean) {
    controller.current?.command({ type: sound ? "unMute" : "mute" });
    controller.current?.command({ type: "play" });
  }
  function togglePlayback() {
    if (controller.current?.playing) controller.current.command({ type: "pause" });
    else activate(true);
  }
  useImperativeHandle(ref, () => ({ seek, activate, togglePlayback }));

  const reportPlayback = useEffectEvent((playing: boolean) => onPlayingChange(playing));
  const reportNativeControls = useEffectEvent(() => {
    setNativeControls(true);
    onNativeControlsChange(true);
  });

  const syncPlayback = useEffectEvent(() => {
    if (hidden) {
      controller.current?.command({ type: "mute" });
      controller.current?.command({ type: "pause" });
    } else activate(expanded);
  });

  const reportTime = useEffectEvent((seconds: number) => {
    if (hidden || !Number.isFinite(seconds)) return;
    firstStart.current = seconds;
    if (expanded) onTime(seconds);
    else if (segmentStart !== null && segmentEnd !== null && seconds >= segmentEnd) seek(segmentStart);
  });
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let cancelled = false;
    let frame: HTMLIFrameElement | null = null;
    let player: YTPlayer | null = null;
    let usingNativeControls = nativeMode.current;
    const lifecycle = new CookPlayerController({
      send(command) {
        if (platform === "youtube" && player) {
          switch (command.type) {
            case "play": player.playVideo(); break;
            case "pause": player.pauseVideo(); break;
            case "mute": player.mute(); break;
            case "unMute": player.unMute(); break;
            case "seekTo": player.seekTo(command.value, true); break;
          }
        }
      },
      onPlayingChange: reportPlayback,
      onFallback() {
        usingNativeControls = true;
        nativeMode.current = true;
        reportNativeControls();
        mountFrame();
      },
    }, usingNativeControls);
    controller.current = lifecycle;

    function mountFrame() {
      // Only fallback replaces the iframe; PiP/expanded transitions keep it alive.
      frame = null;
      player?.destroy();
      player = null;
      const target = document.createElement("iframe");
      frame = target;
      target.title = `Video: ${title}`;
      target.tabIndex = usingNativeControls ? 0 : -1;
      target.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      target.allowFullscreen = true;
      target.className = "size-full border-0";
      target.addEventListener("load", () => {
        if (!cancelled && frame === target) lifecycle.loaded();
      });
      target.addEventListener("error", () => {
        if (!cancelled && frame === target) reportFailure();
      });
      if (platform === "youtube") {
        const params = new URLSearchParams({
          autoplay: "0", controls: usingNativeControls ? "1" : "0", rel: "0",
          iv_load_policy: "3", cc_load_policy: "0", hl: "es", playsinline: "1", enablejsapi: "1",
          disablekb: usingNativeControls ? "0" : "1", fs: usingNativeControls ? "1" : "0",
          origin: window.location.origin, start: String(firstStart.current),
        });
        target.src = `https://www.youtube.com/embed/${videoId}?${params}`;
        loadYouTubeApi().then((YT) => {
          if (cancelled || frame !== target) return;
          player = new YT.Player(target, {
            events: {
              onReady: ({ target: readyPlayer }) => {
                if (cancelled || frame !== target) return;
                player = readyPlayer;
                readyPlayer.getIframe().tabIndex = usingNativeControls ? 0 : -1;
                lifecycle.playerReady();
              },
              onStateChange: ({ data }) => { if (!cancelled && frame === target) lifecycle.stateChanged(data); },
              onAutoplayBlocked: () => { if (!cancelled && frame === target) lifecycle.fallback(); },
              onError: () => { if (!cancelled && frame === target) reportFailure(); },
            },
          });
        }).catch(() => { if (!cancelled && frame === target) lifecycle.fallback(); });
      } else {
        target.src = `https://www.instagram.com/reel/${videoId}/embed`;
      }
      host!.replaceChildren(target);
    }

    mountFrame();
    lifecycle.command({ type: "seekTo", value: firstStart.current });
    syncPlayback();
    const interval = platform === "youtube" ? setInterval(() => {
      if (lifecycle.ready && player?.getPlayerState() === 1) reportTime(player.getCurrentTime());
    }, 500) : undefined;
    return () => {
      cancelled = true;
      if (lifecycle.ready && player) firstStart.current = player.getCurrentTime();
      lifecycle.dispose();
      controller.current = null;
      clearInterval(interval);
      player?.destroy();
      host.replaceChildren();
    };
  }, [platform, videoId, title]);

  useEffect(() => { syncPlayback(); }, [expanded, hidden]);

  return <>
    <div className={`cook-player-stage ${platform === "youtube" ? "cook-player-landscape" : "cook-player-portrait"}`}>
      <div ref={mount} className={`size-full [&>iframe]:size-full ${nativeControls ? "[&>iframe]:pointer-events-auto" : "[&>iframe]:pointer-events-none"}`} />
    </div>
    {failed ? <p role="status" className="absolute inset-0 flex items-center justify-center bg-black p-3 text-center text-xs text-white">No pudimos cargar el video.</p> : null}
  </>;
}
