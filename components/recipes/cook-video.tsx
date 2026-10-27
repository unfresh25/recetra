"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { Icon } from "@/components/ui/icon";
import { pipDragX, pipSnapCorner, segmentProgress, TIKTOK_FRAME, tiktokLayout, videoSwipeDirection, type PipCorner } from "@/lib/recipes/cook-video";
import { formatDuration, type StepToken } from "@/lib/recipes/step-tokens";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils/cn";
import { StepText } from "./step-text";
import { StepVideo, type StepVideoHandle } from "./step-video";
import { TimerTray, type TimersApi } from "./timers";

export function CookVideo({ platform, videoId, title, startSeconds, segmentEnd, tokens, stepIndex, stepCount, onPreviousStep, onNextStep, expanded, hidden, pipSlotRef, corner, onCornerChange, playerRef, timers, onExpandedChange, onHide, onError, onTime, onIngredients, onTimer }: {
  platform: Enums<"source_platform">;
  videoId: string;
  title: string;
  startSeconds: number | null;
  segmentEnd: number | null;
  tokens: StepToken[];
  stepIndex: number;
  stepCount: number;
  onPreviousStep: () => void;
  onNextStep: () => void;
  expanded: boolean;
  hidden: boolean;
  pipSlotRef: RefObject<HTMLDivElement | null>;
  corner: { side: PipCorner };
  onCornerChange: (side: PipCorner) => void;
  playerRef: RefObject<StepVideoHandle | null>;
  timers: TimersApi;
  onExpandedChange: (expanded: boolean) => void;
  onHide: () => void;
  onError: () => void;
  onTime: (seconds: number) => void;
  onIngredients: () => void;
  onTimer: (seconds: number) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const videoFrame = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const before = useRef<{ rect: DOMRect; radius: string } | null>(null);
  const animation = useRef<Animation | null>(null);
  const drag = useRef<{ id: number; x: number; left: number; width: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const wasExpanded = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [playback, setPlayback] = useState<{ step: number; seconds: number } | null>(null);
  const lastPlayback = useRef(false);
  const [fallbackControls, setNativeControls] = useState(false);
  const isTikTok = platform === "tiktok";
  const nativeControls = isTikTok || fallbackControls;
  const [feedback, setFeedback] = useState<{ icon: "play" | "pause"; visible: boolean }>({ icon: "play", visible: false });
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useLayoutEffect(() => () => {
    clearTimeout(feedbackTimeout.current);
    setFeedback((previous) => ({ ...previous, visible: false }));
  }, [expanded, hidden]);

  function reportPlayback(next: boolean) {
    if (lastPlayback.current === next) return;
    lastPlayback.current = next;
    setPlaying(next);
    if (!expanded) return;
    clearTimeout(feedbackTimeout.current);
    setFeedback({ icon: next ? "play" : "pause", visible: true });
    feedbackTimeout.current = setTimeout(() => {
      setFeedback((previous) => ({ ...previous, visible: false }));
    }, 700);
  }

  function captureFrame() {
    const element = videoFrame.current;
    return element ? { rect: element.getBoundingClientRect(), radius: getComputedStyle(element).borderRadius } : null;
  }

  function changeView(next: boolean) {
    before.current = captureFrame();
    playerRef.current?.activate(next);
    onExpandedChange(next);
  }

  // Measure before FLIP reads its destination. Resizes also include wrapped navigation,
  // the dock's safe area and viewport changes; the iframe keeps its original DOM slot.
  useLayoutEffect(() => {
    const slot = pipSlotRef.current;
    const element = frame.current;
    if (!slot || !element || hidden) return;
    const measure = () => {
      const rect = slot.getBoundingClientRect();
      element.style.setProperty("--cook-pip-left", `${rect.left}px`);
      element.style.setProperty("--cook-pip-top", `${rect.top}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(slot);
    if (slot.parentElement) observer.observe(slot.parentElement);
    if (slot.parentElement?.parentElement) observer.observe(slot.parentElement.parentElement);
    const root = slot.closest(".cook-mode");
    if (root) observer.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pipSlotRef, corner, expanded, hidden]);

  // FLIP the card, keeping TikTok in scaled PiP sizing until expansion finishes.
  // Collapse switches back before FLIP starts. The iframe stays in its DOM slot.
  useLayoutEffect(() => {
    const element = videoFrame.current;
    const host = frame.current;
    const previous = before.current;
    before.current = null;
    animation.current?.cancel();
    animation.current = null;
    if (!element || !host || hidden) return;

    const measure = () => {
      if (!isTikTok) return;
      const zoom = Number(getComputedStyle(host).getPropertyValue("--tiktok-zoom"));
      const layout = tiktokLayout(element.clientWidth, element.clientHeight, zoom);
      const videoSizing = host.dataset.tiktokSizing === "video";
      const scale = layout.width / TIKTOK_FRAME.width;
      host.style.setProperty("--tiktok-width", `${videoSizing ? layout.width : TIKTOK_FRAME.width}px`);
      host.style.setProperty("--tiktok-height", `${videoSizing ? layout.height : TIKTOK_FRAME.height}px`);
      host.style.setProperty("--tiktok-left", `${layout.left}px`);
      host.style.setProperty("--tiktok-bottom", `${layout.bottom}px`);
      host.style.setProperty("--tiktok-scale", String(scale));
      host.style.setProperty("--tiktok-bar-height", `${videoSizing ? layout.barHeight : layout.barHeight * scale}px`);
    };
    const setSizing = (video: boolean) => {
      if (!isTikTok) return;
      host.dataset.tiktokSizing = video ? "video" : "pip";
      measure();
    };
    const next = element.getBoundingClientRect();
    const moving = previous && !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      (previous.rect.left !== next.left || previous.rect.top !== next.top || previous.rect.width !== next.width || previous.rect.height !== next.height);
    setSizing(expanded && !moving);
    const observer = isTikTok ? new ResizeObserver(measure) : null;
    observer?.observe(element);

    if (moving) {
      const transition = element.animate([
        { transformOrigin: "top left", transform: `translate(${previous.rect.left - next.left}px, ${previous.rect.top - next.top}px) scale(${previous.rect.width / next.width}, ${previous.rect.height / next.height})`, borderRadius: previous.radius },
        { transformOrigin: "top left", transform: "none", borderRadius: getComputedStyle(element).borderRadius },
      ], { duration: 240, easing: getComputedStyle(document.documentElement).getPropertyValue("--ease-out-soft").trim() });
      animation.current = transition;
      transition.onfinish = () => {
        animation.current = null;
        setSizing(expanded);
      };
    }
    return () => {
      observer?.disconnect();
      if (animation.current) {
        animation.current.onfinish = null;
        animation.current.cancel();
        animation.current = null;
      }
    };
  }, [expanded, corner, hidden, isTikTok]);

  // Size the bottom gradient to the text; long captions grow upward inside the card and can scroll.
  useLayoutEffect(() => {
    const element = text.current;
    if (!element || !expanded || hidden) return;
    caption.current?.scrollTo({ top: 0 });
    const measure = () => frame.current?.style.setProperty("--cook-caption-height", `${element.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, hidden, stepIndex]);

  const ringFraction = segmentProgress(playback?.step === stepIndex ? playback.seconds : null, startSeconds, segmentEnd);

  function nextStep() {
    if (stepIndex >= stepCount - 1) changeView(false);
    onNextStep();
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current;
    if (!start || start.id !== event.pointerId) return;
    swipe.current = null;
    const direction = videoSwipeDirection(start, { x: event.clientX, y: event.clientY });
    if (direction === "previous" && stepIndex > 0) onPreviousStep();
    else if (direction === "next") nextStep();
  }

  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) { swipe.current = null; return; }
    swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  useEffect(() => {
    if (expanded) closeButton.current?.focus({ preventScroll: true });
    else if (wasExpanded.current) expandButton.current?.focus({ preventScroll: true });
    wasExpanded.current = expanded;
  }, [expanded]);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    animation.current?.cancel();
    const rect = frame.current!.getBoundingClientRect();
    drag.current = { id: event.pointerId, x: event.clientX, left: rect.left, width: rect.width, moved: false };
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId || !frame.current) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 6) start.moved = true;
    if (start.moved) frame.current.style.transform = `translateX(${pipDragX(start.left, dx, start.width, window.innerWidth)}px)`;
  }
  function finishDrag(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId || !frame.current) return;
    drag.current = null;
    suppressClick.current = start.moved || cancelled;
    const rect = frame.current.getBoundingClientRect();
    before.current = captureFrame();
    frame.current.style.transform = "";
    onCornerChange(cancelled ? corner.side : pipSnapCorner(rect.left + rect.width / 2, window.innerWidth));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <div ref={frame} role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label={expanded ? "Modo video" : "Video en miniatura"} aria-hidden={hidden || undefined} inert={hidden} data-expanded={expanded} data-platform={platform} data-tiktok-sizing={isTikTok ? expanded ? "video" : "pip" : undefined} data-native-controls={nativeControls} data-corner={corner.side} data-portrait={platform !== "youtube"} className={cn("cook-video-frame", hidden && "invisible pointer-events-none")} onKeyDown={(event) => {
    // Drawer portals bubble through React too; leave their keyboard handling to HeroUI.
    if (!expanded || !frame.current?.contains(event.target as Node)) return;
    if (!event.defaultPrevented && !event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "ArrowLeft" && stepIndex > 0) onPreviousStep();
      else if (event.key === "ArrowRight") nextStep();
    }
    if (event.key === "Escape" && !event.defaultPrevented) {
      event.preventDefault();
      changeView(false);
    }
    if (event.key === "Tab") {
      const controls = Array.from(frame.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], iframe, [tabindex="0"]')).filter((element) => element.tabIndex >= 0 && element.offsetParent !== null && !element.closest('[inert]'));
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && event.target === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && event.target === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <div ref={videoFrame} className="cook-video-card">
      <StepVideo ref={playerRef} platform={platform} videoId={videoId} title={title} startSeconds={startSeconds} segmentStart={startSeconds} segmentEnd={segmentEnd} expanded={expanded} hidden={hidden} onError={onError} onTime={(seconds) => {
        setPlayback({ step: stepIndex, seconds });
        onTime(seconds);
      }} onPlayingChange={reportPlayback} onNativeControlsChange={setNativeControls} />
      {expanded && !nativeControls ? <button type="button" aria-label={playing ? "Pausar video" : "Reproducir video"} onClick={() => playerRef.current?.togglePlayback()} className="absolute inset-0 z-10 flex items-center justify-center bg-transparent text-white focus-visible:outline-white">
        <span aria-hidden className={cn("cook-video-feedback pointer-events-none flex size-14 items-center justify-center rounded-full bg-black/40 text-white", feedback.visible ? "opacity-100" : "opacity-0")}><Icon name={feedback.icon} size={28} /></span>
      </button> : null}
      <div aria-hidden className="cook-video-top-gradient" />
      <div aria-hidden className="cook-video-gradient" />
      {isTikTok && expanded && !hidden ? <TikTokPauseHint /> : null}
    </div>
    <button ref={closeButton} type="button" aria-label="Volver a los pasos" aria-hidden={!expanded} inert={!expanded} onClick={() => changeView(false)} className={cn("absolute right-3 top-[max(env(safe-area-inset-top),0.75rem)] z-30 flex size-11 items-center justify-center bg-transparent text-white focus-visible:outline-white", !expanded && "invisible pointer-events-none")}><Icon name="close" size={24} /></button>
    <button ref={expandButton} type="button" aria-label="Abrir modo video" tabIndex={expanded ? -1 : 0} aria-hidden={expanded} className={cn("absolute z-10 touch-none", nativeControls && !isTikTok ? "top-1 left-1 flex size-7 min-h-7 min-w-7 items-center justify-center rounded-full bg-black/65 text-white" : "inset-0", expanded && "pointer-events-none invisible")} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishDrag} onPointerCancel={(event) => finishDrag(event, true)} onClick={() => {
      if (suppressClick.current) { suppressClick.current = false; return; }
      changeView(true);
    }}>{nativeControls ? <span className={cn("flex size-7 items-center justify-center rounded-full", isTikTok && "btn-float absolute top-1 left-1 text-ink")}><Icon name="arrow-up" className="rotate-45" size={15} /></span> : null}</button>
    {!expanded ? <button type="button" aria-label="Ocultar video" onClick={onHide} className="absolute top-1 right-1 z-30 flex size-7 min-h-7 min-w-7 items-center justify-center rounded-full bg-black/65 text-white"><Icon name="close" size={15} /></button> : null}
    <div aria-hidden={!expanded} inert={!expanded} className="cook-video-overlay absolute inset-0 z-20 text-white [&_:focus-visible]:outline-white">
      <div className="cook-video-timers absolute top-0 left-0 right-16 flex max-h-24 items-start overflow-x-auto px-5 pt-safe">
        <TimerTray api={timers} video />
      </div>
      <p className="sr-only" aria-live="polite">{tokens.map((token) => token.text).join("")}</p>
      <div ref={caption} role="region" aria-label="Texto del paso" tabIndex={expanded ? 0 : -1} className="cook-video-caption" onPointerDown={startSwipe} onPointerUp={finishSwipe} onPointerCancel={() => { swipe.current = null; }}>
        <div ref={text} className="pointer-events-none"><StepText tokens={tokens} onTime={onTimer} video /></div>
      </div>
      <div className="cook-video-chips">
        <button type="button" aria-label="Paso anterior" disabled={stepIndex === 0} onClick={onPreviousStep} className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-white/12 text-white disabled:opacity-40"><Icon name="arrow-left" size={24} /></button>
        <button type="button" aria-label="Siguiente paso" disabled={stepIndex >= stepCount - 1} onClick={onNextStep} className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-white/12 text-white disabled:opacity-40"><Icon name="arrow-right" size={24} /></button>
        {platform === "youtube" ? <button type="button" aria-label={playing ? "Pausar video" : "Reproducir video"} onClick={() => playerRef.current?.togglePlayback()} className="cook-video-progress relative flex size-[52px] shrink-0 items-center justify-center rounded-full bg-transparent text-white">
          <svg aria-hidden viewBox="0 0 52 52" className="pointer-events-none absolute inset-0 size-full -rotate-90 fill-none" strokeWidth="2">
            <circle cx="26" cy="26" r="24" className="stroke-white/25" />
            <circle cx="26" cy="26" r="24" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - ringFraction} strokeLinecap="round" className="stroke-white" />
          </svg>
          <Icon name={playing ? "pause" : "play"} size={18} />
        </button> : null}
        {tokens.filter((token) => token.kind === "time").map((token, index) => <button key={index} type="button" onClick={() => onTimer(token.seconds)} className="cook-video-chip bg-white text-ink"><Icon name="timer" size={20} />{formatDuration(token.seconds)}</button>)}
        <button type="button" onClick={onIngredients} className="cook-video-chip bg-[#1f1f22] text-white"><Icon name="list" size={20} />Ingredientes</button>
        <Link href="/ask" className="cook-video-chip bg-[#1f1f22] text-white"><Icon name="chef-hat" size={20} />Pregúntale a Carmy</Link>
      </div>
    </div>
  </div>;
}

function TikTokPauseHint() {
  const hint = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const key = "recetra:tiktok-pause-hint";
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // The hint still works when browser storage is unavailable.
      if (pauseHintShown) return;
    }
    pauseHintShown = true;
    if (hint.current) hint.current.dataset.visible = "true";
  }, []);
  return <p ref={hint} aria-hidden className="cook-video-pause-hint">Toca el video para ver la pausa</p>;
}

let pauseHintShown = false;
